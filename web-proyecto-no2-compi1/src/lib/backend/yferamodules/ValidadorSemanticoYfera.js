import { TablaSimbolos } from "../semanticsyfera/TablaSimbolos";

import { Simbolo } from "../semanticsyfera/Simbolo";

/*Clase delegada para poder actuar como validador semantico para todo el lenguaje yfera (.y) */
export class ValidadorSemanticoYfera {

    constructor(compilador, moduloActual) {
        this.compilador = compilador;
        this.modulo = moduloActual;

        this.modulo.tablaSimbolos = new TablaSimbolos();
        this.loadsDetectados = [];

        this.nodosLoadPendientes = [];
        this.simbolosPendientesBD = [];
    }

    /*Metodo de inicio de analisis */
    async analizar() {
        await this.recorrerAST(this.modulo.ast, this.modulo.tablaSimbolos);
    }

    /*Recorrido por el AST para poder ir validando */
    async recorrerAST(nodos, entornoActual) {
        if (!nodos || !Array.isArray(nodos)) return;

        for (const nodo of nodos) {
            if (!nodo) continue;

            switch (nodo.tipo) {
                case 'DECLARACION_VARIABLE':
                case 'INICIALIZACION_VARIABLE':
                    this.validarDeclaracion(nodo, entornoActual);
                    break;
                case 'ARREGLO_VACIO':
                case 'ARREGLO_INICIALIZADO':
                case 'ARREGLO_QUERY':
                    this.validarArreglo(nodo, entornoActual);
                    break;

                case 'FUNCION':
                    await this.validarFuncion(nodo, entornoActual);
                    break;

                case 'LOAD_ARCHIVO':
                case 'LOAD_ID':
                    this.nodosLoadPendientes.push({ nodo, entorno: entornoActual });
                    break;
                case 'DATABASE_QUERY':
                    const queryProcesada = this.procesarBackticks(nodo.valor, entorno);
                    return { valor: queryProcesada, tipo: 'QUERY_PENDIENTE' };
            }
        }
    }

    /*Validacion de declaraciones de variables */
    validarDeclaracion(nodo, entorno) {
        if (entorno.existeLocal(nodo.id)) {
            this.compilador.agregarError(this.modulo.nombre, nodo.id, 'Semantico', `La variable '${nodo.id}' ya fue declarada.`, nodo.linea, nodo.columna);
            return;
        }

        let infoExpresion = { valor: null, tipo: nodo.tipado };

        if (nodo.tipo === 'DECLARACION_VARIABLE' && nodo.valor) {
            infoExpresion = this.resolverExpresion(nodo.valor, entorno);

            if (!infoExpresion) return;

            if (!this.sonTiposCompatibles(nodo.tipado, infoExpresion.tipo)) {
                this.compilador.agregarError(this.modulo.nombre, nodo.id, 'Semantico', `Tipo incompatible: No se puede asignar un valor ${infoExpresion.tipo} a la variable '${nodo.id}' de tipo ${nodo.tipado}.`, nodo.linea, nodo.columna);
                return;
            }
        }
        else {
            infoExpresion.valor = this.valorPorDefecto(nodo.tipado);
        }

        const nuevoSimbolo = new Simbolo(nodo.id, nodo.tipado, infoExpresion.valor, nodo.linea, nodo.columna, false);

        entorno.setVariable(nuevoSimbolo);
    }

    /*Metodo que permite resolver las expresiones dentro de una variable*/
    resolverExpresion(nodo, entorno) {
        if (!nodo) return null;

        switch (nodo.tipo) {
            case 'INT': return { valor: parseInt(nodo.valor), tipo: 'ENTERA' };
            case 'FLOAT': return { valor: parseFloat(nodo.valor), tipo: 'FLOAT' };
            case 'CHAR': return { valor: nodo.valor.replace(/[']/g, ''), tipo: 'CARACTER' };
            case 'BOOL': return { valor: nodo.valor, tipo: 'BOOLEANA' };
            case 'VALOR_CADENA': return { valor: nodo.valor, tipo: 'CADENA' };

            case 'ID':
                const variable = entorno.getVariable(nodo.valor);
                if (!variable) {
                    this.compilador.agregarError(this.modulo.nombre, nodo.valor, 'Semantico', `Variable '${nodo.valor}' no definida.`, nodo.linea, nodo.columna);
                    return null;
                }
                return { valor: variable.valor, tipo: variable.tipoDato };

            case 'ARITMETICA':
                const izq = this.resolverExpresion(nodo.izq, entorno);
                const der = this.resolverExpresion(nodo.der, entorno);

                if (!izq || !der) return null;

                let resultado = null;
                if (nodo.op === 'SUMA') resultado = izq.valor + der.valor;
                else if (nodo.op === 'RESTA') resultado = izq.valor - der.valor;
                else if (nodo.op === 'MULTIPLICACION') resultado = izq.valor * der.valor;
                else if (nodo.op === 'DIVISION') {
                    if (der.valor === 0) {
                        this.compilador.agregarError(this.modulo.nombre, "0", 'Semantico', `División por cero detectada en tiempo de compilación.`, nodo.linea, nodo.columna);
                        return null;
                    }
                    resultado = izq.valor / der.valor;
                }
                else if (nodo.op === 'MODULO') resultado = izq.valor % der.valor;

                let tipoResultante = 'ENTERA';
                if (izq.tipo === 'FLOAT' || der.tipo === 'FLOAT') tipoResultante = 'FLOAT';
                if (izq.tipo === 'CADENA' || der.tipo === 'CADENA') tipoResultante = 'CADENA';

                return { valor: resultado, tipo: tipoResultante };

            case 'ARREGLO_INICIALIZADO':
                const valores = nodo.valores.map(v => this.resolverExpresion(v, entorno).valor);
                return { valor: valores, tipo: nodo.tipado, esArreglo: true };

            case 'ARREGLO_VACIO':
                const tam = this.resolverExpresion(nodo.amplitud, entorno).valor;
                const defecto = this.valorPorDefecto(nodo.tipado);
                const arrayFisico = new Array(tam).fill(defecto);
                return { valor: arrayFisico, tipo: nodo.tipado, esArreglo: true };

            case 'ACCESO_ARREGLO':
                const symArr = entorno.getVariable(nodo.id);
                if (!symArr || !symArr.esArreglo) {
                    this.compilador.agregarError(this.modulo.nombre, nodo.id, 'Semantico', ` '${nodo.id}' no es un arreglo.`, nodo.linea, nodo.columna);
                    return null;
                }
                const index = this.resolverExpresion(nodo.indice, entorno).valor;
                if (typeof index === 'number' && (index < 0 || index >= symArr.valor.length)) {
                    this.compilador.agregarError(this.modulo.nombre, nodo.id, 'Semantico', `Índice ${index} fuera de límites para el arreglo '${nodo.id}'.`, nodo.linea, nodo.columna);
                    return null;
                }
                return { valor: symArr.valor[index], tipo: symArr.tipoDato };

            case 'DATABASE_QUERY':
                const queryProcesada = this.procesarBackticks(nodo.valor, entorno);
                return { valor: queryProcesada, tipo: 'QUERY_PENDIENTE' };

            case 'QUERY_TEMPLATE':
                let queryArmada = "";

                for (const fragmento of nodo.fragmentos) {

                    if (fragmento.tipo === 'TEXTO_QUERY') {
                        queryArmada += fragmento.valor;
                    }
                    else if (fragmento.tipo === 'VAR_INTERPOLADA') {
                        const nombreVar = fragmento.id.replace('$', '').trim();

                        const variable = entorno.getVariable(nombreVar);

                        if (!variable) {
                            this.compilador.agregarError(this.modulo.nombre, fragmento.id, 'Semantico SQL', `Variable interpolada '${fragmento.id}' no ha sido declarada.`, fragmento.linea, fragmento.columna);
                            return null;
                        }

                        queryArmada += variable.valor;
                    }
                }
                return { valor: queryArmada, tipo: 'QUERY_PENDIENTE' };
            default:

                return { valor: null, tipo: 'DESCONOCIDO' };
        }
    }

    /*Metodo que permite comparar si son tipos compatibles*/
    sonTiposCompatibles(tipoDestino, tipoValor) {
        if (tipoDestino === tipoValor) return true;
        if (tipoValor === 'DINAMICO') return true;

        // Promociones y conversiones permitidas por tu lenguaje
        if (tipoDestino === 'FLOAT' && tipoValor === 'ENTERA') return true;
        if (tipoDestino === 'ENTERA' && tipoValor === 'CARACTER') return true;
        if (tipoDestino === 'CARACTER' && tipoValor === 'ENTERA') return true;
        if (tipoDestino === 'ENTERA' && tipoValor === 'BOOLEANA') return true;

        return false;
    }

    /*Asignacion de valores por defecto*/
    valorPorDefecto(tipo) {
        switch (tipo) {
            case 'ENTERA': return 0;
            case 'FLOAT': return 0.0;
            case 'BOOLEANA': return false;
            case 'CARACTER': return '';
            case 'CADENA': return "";
            default: return null;
        }
    }

    /*Metodo que permite validar la semantica dentro de una funcion*/
    async validarFuncion(nodo, entornoActual) {

        const entornoLocal = new TablaSimbolos(entornoActual);

        if (nodo.parametros) {
            for (const param of nodo.parametros) {
                const simParam = new Simbolo(param.id, param.tipado, null, param.linea, param.columna);
                entornoLocal.setVariable(simParam);
            }
        }

        await this.recorrerAST(nodo.cuerpo, entornoLocal);
    }

    /*Metodo que permite validar las expresiones dentro del load*/
    async validarLoad(nodo, entornoActual) {
        let infoRuta = null;

        if (nodo.tipo === 'LOAD_ARCHIVO') {
            infoRuta = this.resolverExpresion(nodo.uri, entornoActual);
        }

        else if (nodo.tipo === 'LOAD_ID') {
            const variable = entornoActual.getVariable(nodo.id);

            if (!variable) {
                this.compilador.agregarError(this.modulo.nombre, nodo.id, 'Semantico', `Variable '${nodo.id}' no definida.`, nodo.linea, nodo.columna);
                return;
            }

            infoRuta = { valor: variable.valor, tipo: variable.tipoDato };
        }

        if (!infoRuta || infoRuta.tipo !== 'CADENA' || !infoRuta.valor) {
            this.compilador.agregarError(this.modulo.nombre, "load", 'Semantico', `El LOAD requiere una ruta tipo STRING.`, nodo.linea, nodo.columna);
            return;
        }

        this.loadsDetectados.push({
            ruta: infoRuta.valor.trim(),
            linea: nodo.linea,
            columna: nodo.columna
        });
    }

    /* Validacion especifica para Arreglos*/
    validarArreglo(nodo, entorno) {
        if (entorno.existeLocal(nodo.id)) {
            this.compilador.agregarError(this.modulo.nombre, nodo.id, 'Semantico', `El arreglo '${nodo.id}' ya fue declarado.`, nodo.linea, nodo.columna);
            return;
        }

        let arregloJS = null;
        let esQueryPendiente = false;

        if (nodo.tipo === 'ARREGLO_VACIO') {
            const tamano = this.resolverExpresion(nodo.amplitud, entorno);

            if (!tamano || tamano.tipo !== 'ENTERA') {
                this.compilador.agregarError(this.modulo.nombre, nodo.id, 'Semantico', `La amplitud del arreglo debe ser un número ENTERO.`, nodo.linea, nodo.columna);
                return;
            }

            const valorDefecto = this.valorPorDefecto(nodo.tipado);
            arregloJS = new Array(tamano.valor).fill(valorDefecto);

        }
        else if (nodo.tipo === 'ARREGLO_INICIALIZADO') {

            arregloJS = [];

            for (const valNodo of nodo.valores) {
                const infoVal = this.resolverExpresion(valNodo, entorno);

                if (!infoVal) continue;

                if (!this.sonTiposCompatibles(nodo.tipado, infoVal.tipo)) {
                    this.compilador.agregarError(this.modulo.nombre, nodo.id, 'Semantico', `Tipo incompatible en arreglo. Se esperaba ${nodo.tipado} pero se encontró ${infoVal.tipo}.`, nodo.linea, nodo.columna);
                } else {
                    arregloJS.push(infoVal.valor);
                }
            }

        }
       else if (nodo.tipo === 'ARREGLO_QUERY') {
            
            const infoQuery = this.resolverExpresion(nodo.query, entorno);
            
            if (infoQuery) {
                arregloJS = infoQuery.valor;
            }
            
            esQueryPendiente = true; 
        }

        const nuevoSimbolo = new Simbolo(
            nodo.id,
            nodo.tipado,
            arregloJS,
            nodo.linea,
            nodo.columna,
            true
        );

        if (esQueryPendiente) {
            nuevoSimbolo.esperandoRespuestaBD = true;
        }

        entorno.setVariable(nuevoSimbolo);
    }

    async resolverQueriesPendientes(interpreteSQL) {
        for (const simbolo of this.simbolosPendientesBD) {
            const queryStr = simbolo.valor;

            const response = await interpreteSQL.ejecutarCodigo(queryStr);

            if (!response.exito) {
                this.compilador.agregarError(this.modulo.nombre, "EXECUTE", 'Semantico SQL', `Error BD: ${response.errores[0].descripcion}`, simbolo.linea, simbolo.columna);
                continue;
            }

            const resultadoSQL = response.resultados[0];

            if (resultadoSQL && resultadoSQL.valores) {
                const tipoTraducido = this.mapearTipoSQL(resultadoSQL.tipo);

                if (!this.sonTiposCompatibles(simbolo.tipoDato, tipoTraducido)) {
                    this.compilador.agregarError(this.modulo.nombre, simbolo.id, 'Semantico', `El tipo de BD (${tipoTraducido}) no coincide con el arreglo de tipo ${simbolo.tipoDato}`, simbolo.linea, simbolo.columna);
                } else {
                    simbolo.valor = resultadoSQL.valores;
                }
            }

            simbolo.esperandoRespuestaBD = false;
        }
    }

    /*Metodo que permite procesar todos los loads pendientes*/
    async procesarLoadsPendientes() {
        for (const item of this.nodosLoadPendientes) {
            await this.validarLoad(item.nodo, item.entorno);
        }
    }

    /*Metodo que permite mapear tipos retornados de sql al lenguaje yfera*/
    mapearTipoSQL(tipoSQL) {
        switch (tipoSQL) {
            case 'INT': return 'ENTERA';
            case 'FLOAT': return 'FLOAT';
            case 'BOOLEAN': return 'BOOLEANA';
            case 'CHAR': return 'CARACTER';
            case 'STRING': return 'CADENA';
            default: return 'DESCONOCIDO';
        }
    }

}