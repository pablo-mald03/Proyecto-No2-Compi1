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

        this.asignacionesPendientes = [];

        this.loadsEnInicializacion = [];
    }

    /*Metodo de inicio de analisis */
    async analizar() {
        try {
            await this.pasadaDeclaracionGlobal(this.modulo.ast, this.modulo.tablaSimbolos);

            await this.pasadaInicializacionGlobal(this.modulo.ast, this.modulo.tablaSimbolos);

            if (this.simbolosPendientesBD.length > 0) {
                const interprete = new InterpreteSqlCodigo(this.compilador.dataBase);
                await this.resolverQueriesPendientes(interprete);
            }

            for (const item of this.loadsEnInicializacion) {
                await this.validarLoad(item.nodo, item.entorno);
            }

            await this.procesarLoadsPendientes();

            console.log('Tabla de símbolos globales completa:',
                Array.from(this.modulo.tablaSimbolos.simbolos?.entries() || [])
            );

        } catch (error) {
            this.compilador.agregarError(
                this.modulo.nombre,
                'N/A',
                'Compilacion',
                `Error en análisis semántico: ${error.message}`
            );
        }
    }


    async pasadaDeclaracionGlobal(nodos, entorno) {
        if (!nodos || !Array.isArray(nodos)) return;

        for (const nodo of nodos) {
            if (!nodo) continue;

            switch (nodo.tipo) {
                case 'DECLARACION_VARIABLE':
                case 'INICIALIZACION_VARIABLE':
                    if (entorno.existeLocal(nodo.id)) {
                        this.compilador.agregarError(
                            this.modulo.nombre,
                            nodo.id,
                            'Semantico',
                            `La variable global '${nodo.id}' ya fue declarada.`,
                            nodo.linea,
                            nodo.columna
                        );
                        continue;
                    }

                    const simboloVar = new Simbolo(
                        nodo.id,
                        nodo.tipado,
                        null,
                        nodo.linea,
                        nodo.columna,
                        false
                    );
                    entorno.setVariable(simboloVar);
                    break;

                case 'ARREGLO_VACIO':
                case 'ARREGLO_INICIALIZADO':
                case 'ARREGLO_QUERY':
                    if (entorno.existeLocal(nodo.id)) {
                        this.compilador.agregarError(
                            this.modulo.nombre,
                            nodo.id,
                            'Semantico',
                            `El arreglo global '${nodo.id}' ya fue declarado.`,
                            nodo.linea,
                            nodo.columna
                        );
                        continue;
                    }

                    const simboloArr = new Simbolo(
                        nodo.id,
                        nodo.tipado,
                        null,
                        nodo.linea,
                        nodo.columna,
                        true
                    );
                    entorno.setVariable(simboloArr);
                    break;

                case 'FUNCION':
                    if (entorno.existeLocal(nodo.id)) {
                        this.compilador.agregarError(
                            this.modulo.nombre,
                            nodo.id,
                            'Semantico',
                            `La función '${nodo.id}' ya fue declarada.`,
                            nodo.linea,
                            nodo.columna
                        );
                        continue;
                    }

                    const simboloFunc = new Simbolo(
                        nodo.id,
                        'FUNCION',
                        nodo,
                        nodo.linea,
                        nodo.columna,
                        false
                    );
                    entorno.setVariable(simboloFunc);

                    await this.recolectarLoadsDeFuncion(nodo.cuerpo, entorno);
                    break;

                case 'FUNCION_MAIN':
                    break;

                case 'LOAD_ARCHIVO':
                case 'LOAD_ID':
                    this.loadsEnInicializacion.push({ nodo, entorno });
                    break;

                case 'INSTRUCCION_IMPORT':
                    break;
            }
        }
    }


    async pasadaInicializacionGlobal(nodos, entorno) {
        if (!nodos || !Array.isArray(nodos)) return;

        for (const nodo of nodos) {
            if (!nodo) continue;

            switch (nodo.tipo) {
                case 'DECLARACION_VARIABLE':
                case 'INICIALIZACION_VARIABLE':
                    if (nodo.valor) {
                        await this.inicializarVariableSimple(nodo, entorno);
                    }
                    break;

                case 'ARREGLO_VACIO':
                    await this.inicializarArregloVacio(nodo, entorno);
                    break;

                case 'ARREGLO_INICIALIZADO':
                    await this.inicializarArregloConValores(nodo, entorno);
                    break;

                case 'ARREGLO_QUERY':
                    await this.inicializarArregloQuery(nodo, entorno);
                    break;


                case 'FUNCION':
                case 'FUNCION_MAIN':
                case 'INSTRUCCION_IMPORT':
                    break;
            }
        }
    }

    async recolectarLoadsDeFuncion(cuerpo, entorno) {
        if (!cuerpo || !Array.isArray(cuerpo)) return;

        for (const instruccion of cuerpo) {
            if (!instruccion) continue;

            switch (instruccion.tipo) {
                case 'LOAD_ARCHIVO':
                case 'LOAD_ID':
                    // Recolectar el load para procesarlo después
                    this.loadsEnInicializacion.push({
                        nodo: instruccion,
                        entorno: entorno
                    });
                    break;

                default:
                    break;
            }
        }
    }

    async inicializarVariableSimple(nodo, entorno) {
        const simbolo = entorno.getVariable(nodo.id);
        if (!simbolo || simbolo.valor !== null) return;

        const valorResuelto = await this.resolverExpresionSimple(nodo.valor, entorno);

        if (!valorResuelto) return;

        if (!this.sonTiposCompatibles(nodo.tipado, valorResuelto.tipo)) {
            this.compilador.agregarError(
                this.modulo.nombre,
                nodo.id,
                'Semantico',
                `Tipo incompatible: no se puede asignar ${valorResuelto.tipo} a '${nodo.id}' de tipo ${nodo.tipado}.`,
                nodo.linea,
                nodo.columna
            );
            return;
        }

        simbolo.valor = valorResuelto.valor;
    }

    async inicializarArregloVacio(nodo, entorno) {
        const simbolo = entorno.getVariable(nodo.id);
        if (!simbolo || simbolo.valor !== null) return;

        const tamanoResuelto = await this.resolverExpresionSimple(nodo.amplitud, entorno);

        if (!tamanoResuelto || tamanoResuelto.tipo !== 'ENTERA') {
            this.compilador.agregarError(
                this.modulo.nombre,
                nodo.id,
                'Semantico',
                `La amplitud del arreglo debe ser un número ENTERO.`,
                nodo.linea,
                nodo.columna
            );
            return;
        }

        const valorDefecto = this.valorPorDefecto(nodo.tipado);
        simbolo.valor = new Array(tamanoResuelto.valor).fill(valorDefecto);
        simbolo.tamano = tamanoResuelto.valor;
    }

    async inicializarArregloConValores(nodo, entorno) {
        const simbolo = entorno.getVariable(nodo.id);
        if (!simbolo || simbolo.valor !== null) return;

        const valores = [];

        for (const exp of nodo.valores) {
            const resuelto = await this.resolverExpresionSimple(exp, entorno);

            if (!resuelto) {
                valores.push(this.valorPorDefecto(nodo.tipado));
                continue;
            }

            if (!this.sonTiposCompatibles(nodo.tipado, resuelto.tipo)) {
                this.compilador.agregarError(
                    this.modulo.nombre,
                    nodo.id,
                    'Semantico',
                    `Tipo incompatible en arreglo. Se esperaba ${nodo.tipado} pero se encontró ${resuelto.tipo}.`,
                    nodo.linea,
                    nodo.columna
                );
            }

            valores.push(resuelto.valor);
        }

        simbolo.valor = valores;
        simbolo.tamano = valores.length;
    }

    async inicializarArregloQuery(nodo, entorno) {
        const simbolo = entorno.getVariable(nodo.id);
        if (!simbolo || simbolo.valor !== null) return;

        simbolo.valor = [];
        simbolo.tamano = 0;
        simbolo.esperandoRespuestaBD = true;

        this.simbolosPendientesBD.push(simbolo);
    }



    async resolverExpresionSimple(nodo, entorno) {
        if (!nodo) return null;

        switch (nodo.tipo) {
            case 'INT':
                return { valor: parseInt(nodo.valor), tipo: 'ENTERA' };
            case 'FLOAT':
                return { valor: parseFloat(nodo.valor), tipo: 'FLOAT' };
            case 'VALOR_CADENA':
                return { valor: nodo.valor, tipo: 'CADENA' };
            case 'CHAR':
                return { valor: nodo.valor.replace(/[']/g, ''), tipo: 'CARACTER' };
            case 'BOOL':
                return { valor: nodo.valor === true || nodo.valor === 'true', tipo: 'BOOLEANA' };

            case 'ID':
                const variable = entorno.getVariable(nodo.valor);
                if (!variable) {
                    this.compilador.agregarError(
                        this.modulo.nombre,
                        nodo.valor,
                        'Semantico',
                        `Variable '${nodo.valor}' no definida.`,
                        nodo.linea,
                        nodo.columna
                    );
                    return null;
                }

                if (variable.valor === null) {
                    this.compilador.agregarError(
                        this.modulo.nombre,
                        nodo.valor,
                        'Semantico',
                        `Variable '${nodo.valor}' no ha sido inicializada.`,
                        nodo.linea,
                        nodo.columna
                    );
                    return null;
                }

                return { valor: variable.valor, tipo: variable.tipoDato };

            case 'ACCESO_ARREGLO':
                const arreglo = entorno.getVariable(nodo.valor || nodo.id);
                if (!arreglo) {
                    this.compilador.agregarError(
                        this.modulo.nombre,
                        nodo.valor || nodo.id,
                        'Semantico',
                        `Variable '${nodo.valor || nodo.id}' no definida.`,
                        nodo.linea,
                        nodo.columna
                    );
                    return null;
                }

                if (!arreglo.esArreglo) {
                    this.compilador.agregarError(
                        this.modulo.nombre,
                        nodo.valor || nodo.id,
                        'Semantico',
                        `'${nodo.valor || nodo.id}' no es un arreglo.`,
                        nodo.linea,
                        nodo.columna
                    );
                    return null;
                }

                if (!arreglo.valor) {
                    return { valor: this.valorPorDefecto(arreglo.tipoDato), tipo: arreglo.tipoDato };
                }

                const indice = await this.resolverExpresionSimple(nodo.indice, entorno);
                if (!indice || typeof indice.valor !== 'number') {
                    return null;
                }

                if (indice.valor < 0 || indice.valor >= arreglo.valor.length) {
                    this.compilador.agregarError(
                        this.modulo.nombre,
                        nodo.valor || nodo.id,
                        'Semantico',
                        `Índice ${indice.valor} fuera de límites [0-${arreglo.valor.length - 1}].`,
                        nodo.linea,
                        nodo.columna
                    );
                    return null;
                }

                return { valor: arreglo.valor[indice.valor], tipo: arreglo.tipoDato };

            case 'ARITMETICA':
                const izq = await this.resolverExpresionSimple(nodo.izq, entorno);
                const der = await this.resolverExpresionSimple(nodo.der, entorno);

                if (!izq || !der) return null;
                if (izq.valor === null || der.valor === null) return null;

                let resultado;
                switch (nodo.op) {
                    case 'SUMA': resultado = izq.valor + der.valor; break;
                    case 'RESTA': resultado = izq.valor - der.valor; break;
                    case 'MULTIPLICACION': resultado = izq.valor * der.valor; break;
                    case 'DIVISION':
                        if (der.valor === 0) {
                            this.compilador.agregarError(
                                this.modulo.nombre, "0", 'Semantico',
                                'División por cero detectada.',
                                nodo.linea, nodo.columna
                            );
                            return null;
                        }
                        resultado = izq.valor / der.valor;
                        break;
                    case 'MODULO':
                        if (der.valor === 0) {
                            this.compilador.agregarError(
                                this.modulo.nombre, "0", 'Semantico',
                                'Módulo por cero detectado.',
                                nodo.linea, nodo.columna
                            );
                            return null;
                        }
                        resultado = izq.valor % der.valor;
                        break;
                    default: return null;
                }

                const tipo = (izq.tipo === 'FLOAT' || der.tipo === 'FLOAT') ? 'FLOAT' :
                    (izq.tipo === 'CADENA' || der.tipo === 'CADENA') ? 'CADENA' : 'ENTERA';

                return { valor: resultado, tipo };

            case 'UNARIA':
                if (nodo.op === 'NEGATIVO') {
                    const derUnario = await this.resolverExpresionSimple(nodo.der, entorno);
                    if (!derUnario) return null;
                    return { valor: -derUnario.valor, tipo: derUnario.tipo };
                }
                if (nodo.op === 'NOT') {
                    const derNot = await this.resolverExpresionSimple(nodo.der, entorno);
                    if (!derNot) return null;
                    return { valor: !derNot.valor, tipo: 'BOOLEANA' };
                }
                return null;

            default:
                return null;
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


    /*Metodo que permite validar las expresiones dentro del load*/
    async validarLoad(nodo, entornoActual) {
        let infoRuta = null;

        if (nodo.tipo === 'LOAD_ARCHIVO') {
            infoRuta = await this.resolverExpresionSimple(nodo.uri, entornoActual);
        }
        else if (nodo.tipo === 'LOAD_ID') {
            const variable = entornoActual.getVariable(nodo.id);

            if (!variable) {
                this.compilador.agregarError(
                    this.modulo.nombre,
                    nodo.id,
                    'Semantico',
                    `Variable '${nodo.id}' no definida.`,
                    nodo.linea,
                    nodo.columna
                );
                return;
            }

            infoRuta = { valor: variable.valor, tipo: variable.tipoDato };
        }

        if (!infoRuta || infoRuta.tipo !== 'CADENA' || !infoRuta.valor) {
            this.compilador.agregarError(
                this.modulo.nombre,
                "load",
                'Semantico',
                `El LOAD requiere una ruta tipo STRING.`,
                nodo.linea,
                nodo.columna
            );
            return;
        }

        this.loadsDetectados.push({
            ruta: infoRuta.valor.trim(),
            linea: nodo.linea,
            columna: nodo.columna
        });
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