import { TablaSimbolos } from "../semanticsyfera/TablaSimbolos";

import { Simbolo } from "../semanticsyfera/Simbolo";

/*Clase delegada para poder actuar como validador semantico para todo el lenguaje yfera (.y) */
export class ValidadorSemanticoYfera {

    constructor(compilador, moduloActual) {
        this.compilador = compilador;
        this.modulo = moduloActual;

        this.modulo.tablaSimbolos = new TablaSimbolos();
        this.loadsDetectados = [];
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

                case 'FUNCION':
                    await this.validarFuncion(nodo, entornoActual);
                    break;

                case 'FUNCION_MAIN':
                    const entornoMain = new TablaSimbolos(entornoActual);

                    await this.recorrerAST(nodo.cuerpo, entornoMain);
                    break;

                case 'CICLO_WHILE':
                case 'CICLO_DO_WHILE':
                    const entornoCiclo = new TablaSimbolos(entornoActual);
                    await this.recorrerAST(nodo.cuerpo, entornoCiclo);
                    break;

                case 'LOAD_ARCHIVO':
                    await this.validarLoad(nodo, entornoActual);
                    break;

                //Pendiente demas codigo
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

        const nuevoSimbolo = new Simbolo(nodo.id, nodo.tipado, infoExpresion.valor, nodo.linea, nodo.columna, nodo.esArreglo || false);
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

            case 'DATABASE_QUERY':
            case 'QUERY_TEMPLATE':
            case 'LLAMADA_ARROBA_VAR':
            case 'ACCESO_ARREGLO':
                return { valor: null, tipo: 'DINAMICO' };

            case 'ARREGLO_INICIALIZADO':
                const valoresResueltos = nodo.valores.map(valNodo => {
                    const res = this.resolverExpresion(valNodo, entorno);
                    return res ? res.valor : null;
                });
                return { valor: valoresResueltos, tipo: nodo.tipado };

            case 'ARREGLO_VACIO':
             
                const amplitud = this.resolverExpresion(nodo.amplitud, entorno).valor;
                const arrayVacio = new Array(amplitud).fill(this.valorPorDefecto(nodo.tipado));
                return { valor: arrayVacio, tipo: nodo.tipado };
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

        const infoRuta = this.resolverExpresion(nodo.uri, entornoActual);

        if (!infoRuta || infoRuta.tipo !== 'CADENA' || !infoRuta.valor) {
            this.compilador.agregarError(this.modulo.nombre, "LOAD", 'Semantico', `El LOAD requiere una ruta STRING valida y constante.`, nodo.linea, nodo.columna);
            return;
        }

        this.loadsDetectados.push({
            ruta: infoRuta.valor.trim(),
            linea: nodo.linea,
            columna: nodo.columna
        });
    }

}