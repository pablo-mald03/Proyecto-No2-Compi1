import { TablaSimbolos } from "../semanticsyfera/TablaSimbolos";

import { Simbolo } from "../semanticsyfera/Simbolo";

import { InterpreteSqlCodigo } from "$lib/databasemodules/InterpreteSqlCodigo";

import { ResultadoTipado } from "$lib/modules/ResultadoTipado";

import parserData from "$lib/analizador/compiler/database-config";

/*Clase delegada para poder actuar como validador semantico para todo el lenguaje yfera (.y) */
export class ValidadorSemanticoYfera {

    constructor(compilador, moduloActual, manejadorDb) {
        this.compilador = compilador;

        this.manejadorBase = manejadorDb;

        this.modulo = moduloActual;

        this.modulo.tablaSimbolos = new TablaSimbolos();
        this.loadsDetectados = [];

        this.nodosLoadPendientes = [];

        this.simbolosPendientesBD = [];

        this.asignacionesPendientes = [];

        this.loadsEnInicializacion = [];

        this.variablesDependientesDeQuery = [];
    }

    /*Metodo de inicio de analisis */
    async analizar() {
        try {
            await this.pasadaDeclaracionGlobal(this.modulo.ast, this.modulo.tablaSimbolos);
            await this.pasadaInicializacionGlobal(this.modulo.ast, this.modulo.tablaSimbolos);

            if (this.simbolosPendientesBD.length > 0) {
                const interprete = new InterpreteSqlCodigo(this.manejadorBase);
                await this.resolverQueriesPendientes(interprete);
            }

            await this.inicializarVariablesDependientes();

            for (const item of this.loadsEnInicializacion) {
                await this.validarLoad(item.nodo, item.entorno);
            }
            await this.procesarLoadsPendientes();

        } catch (error) {
            this.compilador.agregarError(
                this.modulo.nombre, 'N/A', 'Compilacion',
                `Error en análisis semántico: ${error.message}`
            );
        }
    }

    /*Metodo que permite evaluar las variables pendientes de arreglos con querys */
    async inicializarVariablesDependientes() {
        for (const { nodo, entorno } of this.variablesDependientesDeQuery) {
            const simbolo = entorno.getVariable(nodo.id);
            if (!simbolo || simbolo.valor !== null) continue;

            const valorResuelto = await this.resolverExpresionSimple(nodo.valor, entorno);
            if (!valorResuelto) continue;

            if (!this.sonTiposCompatibles(nodo.tipado, valorResuelto.tipo)) {
                this.compilador.agregarError(
                    this.modulo.nombre, nodo.id, 'Semantico',
                    `Tipo incompatible: no se puede asignar ${valorResuelto.tipo} a '${nodo.id}' de tipo ${nodo.tipado}.`,
                    nodo.linea, nodo.columna
                );
                continue;
            }

            simbolo.valor = valorResuelto.valor;
        }
    }

    /*Metodo que permite evaluar una query template dentro de una instruccion excecute*/
    resolverQueryTemplate(nodoQuery, entorno) {
        if (!nodoQuery || nodoQuery.tipo !== 'QUERY_TEMPLATE') {
            return null;
        }

        if (!nodoQuery.fragmentos || !Array.isArray(nodoQuery.fragmentos)) {
            return null;
        }

        let queryArmada = "";

        for (const fragmento of nodoQuery.fragmentos) {
            if (fragmento.tipo === 'TEXTO_QUERY') {
                queryArmada += fragmento.valor;
            }
            else if (fragmento.tipo === 'VAR_INTERPOLADA') {
                const nombreVar = fragmento.id.replace('$', '').trim();
                let variable = entorno.getVariable(nombreVar);

                if (!variable) {
                    variable = this.modulo.tablaSimbolos.getVariable(nombreVar);
                }

                if (!variable) {
                    this.compilador.agregarError(
                        this.modulo.nombre,
                        fragmento.id,
                        'Semantico SQL',
                        `Variable interpolada '${fragmento.id}' no ha sido declarada en ningún ámbito.`,
                        fragmento.linea,
                        fragmento.columna
                    );
                    return null;
                }

                const esAmbitoGlobal = (entorno === this.modulo.tablaSimbolos);

                if (!esAmbitoGlobal) {
                    if (variable.tipoDato !== 'ENTERA' &&
                        variable.tipoDato !== 'FLOAT' &&
                        variable.tipoDato !== 'CADENA' &&
                        variable.tipoDato !== 'BOOLEANA' &&
                        variable.tipoDato !== 'CARACTER') {
                        this.compilador.agregarError(
                            this.modulo.nombre,
                            fragmento.id,
                            'Semantico SQL',
                            `Variable interpolada '${fragmento.id}' tiene tipo no interpolable: ${variable.tipoDato}.`,
                            fragmento.linea,
                            fragmento.columna
                        );
                        return null;
                    }
                    queryArmada += `\${${nombreVar}}`;
                    continue;
                }

                if (variable.valor === null || variable.valor === undefined) {
                    this.compilador.agregarError(
                        this.modulo.nombre,
                        fragmento.id,
                        'Semantico SQL',
                        `Variable interpolada '${fragmento.id}' no ha sido inicializada.`,
                        fragmento.linea,
                        fragmento.columna
                    );
                    return null;
                }

                let valorStr = variable.valor;
                if (typeof valorStr === 'string') {
                    valorStr = `'${valorStr}'`;
                } else if (typeof valorStr === 'boolean') {
                    valorStr = valorStr ? '1' : '0';
                }

                queryArmada += valorStr;
            }
        }
        return queryArmada;
    }

    /*Metodo que permite resolver las querys pendientes */
    async resolverQueriesPendientes(interpreteSQL) {
        for (const simbolo of this.simbolosPendientesBD) {
            const queryStr = simbolo.queryPendiente;

            if (!queryStr || queryStr.trim() === '') {
                this.compilador.agregarError(this.modulo.nombre, simbolo.id, 'Semantico SQL', `Query vacía para el arreglo '${simbolo.id}'`, simbolo.linea, simbolo.columna);
                simbolo.valor = [];
                simbolo.tamano = 0;
                simbolo.esperandoRespuestaBD = false;
                continue;
            }

            const queryFormatedString = `${queryStr};`;

            if (!this.esQueryArreglo(queryFormatedString, simbolo, interpreteSQL)) {
                continue;
            }

            let response;
            try {
                response = await interpreteSQL.ejecutarCodigo(queryFormatedString);
            } catch (error) {
                this.compilador.agregarError(this.modulo.nombre, simbolo.id, 'Semantico SQL', `Error al ejecutar query: ${error.message}`, simbolo.linea, simbolo.columna);
                simbolo.valor = [];
                simbolo.tamano = 0;
                simbolo.esperandoRespuestaBD = false;
                continue;
            }

            const resultado = this.esResponseValido(response, simbolo);
            if (!resultado) continue;

            const tipoTraducido = this.mapearTipoSQL(resultado.tipo);

            if (!this.sonTiposCompatibles(simbolo.tipoDato, tipoTraducido)) {
                this.compilador.agregarError(this.modulo.nombre, simbolo.id, 'Semantico', `El tipo de BD (${tipoTraducido}) no coincide con el arreglo '${simbolo.id}' de tipo ${simbolo.tipoDato}`, simbolo.linea, simbolo.columna);
            }

            simbolo.valor = resultado.valores || [];
            simbolo.tamano = resultado.valores.length;
            simbolo.esperandoRespuestaBD = false;
        }

        this.simbolosPendientesBD = [];
    }

    /*Metodo que permite validar si fue una respuesta valida*/
    esResponseValido(response, simbolo) {
        if (!response.exito) {
            const errorMsg = response.errores && response.errores.length > 0
                ? response.errores[0].descripcion
                : 'Error desconocido en BD';
            this.compilador.agregarError(this.modulo.nombre, simbolo.id, 'Semantico SQL', `Error BD en arreglo '${simbolo.id}': ${errorMsg}`, simbolo.linea, simbolo.columna);
            simbolo.valor = [];
            simbolo.tamano = 0;
            simbolo.esperandoRespuestaBD = false;
            return null;
        }

        if (!response.resultados || response.resultados.length === 0) {
            this.compilador.agregarError(this.modulo.nombre, simbolo.id, 'Semantico', `La consulta para '${simbolo.id}' no retorno resultados.`, simbolo.linea, simbolo.columna);
            simbolo.valor = [];
            simbolo.tamano = 0;
            simbolo.esperandoRespuestaBD = false;
            return null;
        }

        const resultado = response.resultados[0];

        if (!(resultado instanceof ResultadoTipado)) {
            this.compilador.agregarError(this.modulo.nombre, simbolo.id, 'Semantico', `Resultado inesperado para '${simbolo.id}'.`, simbolo.linea, simbolo.columna);
            simbolo.valor = [];
            simbolo.tamano = 0;
            simbolo.esperandoRespuestaBD = false;
            return null;
        }

        if (resultado.valores.length === 0) {
            this.compilador.agregarError(
                this.modulo.nombre,
                simbolo.id,
                'Semantico',
                `La tabla '${resultado.tabla}' no tiene registros.`,
                simbolo.linea,
                simbolo.columna
            );
            simbolo.valor = [];
            simbolo.tamano = 0;
            simbolo.esperandoRespuestaBD = false;
            return null;
        }

        return resultado;
    }

    /*Metodo que permite validar si una query es valida para arreglo (solo SELECT) */
    esQueryArreglo(queryFormatedString, simbolo, interpreteSQL) {
        const validacion = interpreteSQL.validarAccion(queryFormatedString);

        if (validacion.error) {
            this.compilador.agregarError(
                this.modulo.nombre,
                simbolo.id,
                'Semantico SQL',
                `Error en query: ${validacion.error}`,
                simbolo.linea,
                simbolo.columna
            );
            simbolo.valor = [];
            simbolo.tamano = 0;
            simbolo.esperandoRespuestaBD = false;
            return false;
        }

        if (!validacion.esSelect) {
            this.compilador.agregarError(
                this.modulo.nombre,
                simbolo.id,
                'Semantico',
                `No se puede inicializar '${simbolo.id}' con ${validacion.accion}. Solo se permiten SELECT de columna.`,
                simbolo.linea,
                simbolo.columna
            );
            simbolo.valor = [];
            simbolo.tamano = 0;
            simbolo.esperandoRespuestaBD = false;
            return false;
        }

        return true;
    }

    /*Metodo que permite generar la primera pasada de validacion global */
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
                        'FUNCTION',
                        nodo,
                        nodo.linea,
                        nodo.columna,
                        false
                    );
                    entorno.setVariable(simboloFunc);

                    const entornoFuncion = new TablaSimbolos(entorno);

                    if (nodo.parametros && Array.isArray(nodo.parametros)) {
                        for (const param of nodo.parametros) {
                            if (entornoFuncion.existeLocal(param.id)) {
                                this.compilador.agregarError(
                                    this.modulo.nombre,
                                    param.id,
                                    'Semantico',
                                    `Parámetro duplicado '${param.id}' en función '${nodo.id}'.`,
                                    param.linea,
                                    param.columna
                                );
                                continue;
                            }

                            const simboloParam = new Simbolo(
                                param.id,
                                param.tipado,
                                null,
                                param.linea,
                                param.columna,
                                param.tipo === 'PARAMETRO_DEF_ARREGLO'
                            );
                            entornoFuncion.setVariable(simboloParam);
                        }
                    }

                    await this.recolectarLoadsDeFuncion(nodo.cuerpo, entornoFuncion);
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

    /*Metodo que permite generar la primera pasada que inicializa todas las variables con su respectivo valor predeterminado*/
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

    /*Metodo que permite recolectar todo lo que este dentro del load */
    async recolectarLoadsDeFuncion(cuerpo, entorno) {
        if (!cuerpo || !Array.isArray(cuerpo)) return;

        for (const instruccion of cuerpo) {
            if (!instruccion) continue;

            switch (instruccion.tipo) {
                case 'LOAD_ARCHIVO':
                case 'LOAD_ID':
                    this.loadsEnInicializacion.push({
                        nodo: instruccion,
                        entorno: entorno
                    });
                    break;

                case 'DATABASE_QUERY':
                    this.validarVariablesInterpoladas(instruccion.query, entorno);
                    break;

                default:
                    break;
            }
        }
    }

    /*Metodo que valida que las variables interpoladas en una query existan */
    validarVariablesInterpoladas(nodoQuery, entorno) {
        if (!nodoQuery || !nodoQuery.fragmentos || !Array.isArray(nodoQuery.fragmentos)) {
            return;
        }

        for (const fragmento of nodoQuery.fragmentos) {
            if (fragmento.tipo === 'VAR_INTERPOLADA') {
                const nombreVar = fragmento.id;

                let variable = entorno.getVariable(nombreVar);
                if (!variable) {
                    variable = this.modulo.tablaSimbolos.getVariable(nombreVar);
                }

                if (!variable) {
                    this.compilador.agregarError(
                        this.modulo.nombre,
                        fragmento.id,
                        'Semantico SQL',
                        `Variable interpolada '${fragmento.id}' no ha sido declarada en ningun ambito.`,
                        fragmento.linea,
                        fragmento.columna
                    );
                }
            }
        }
    }


    /*Metodo que inicializa las variables simples */
    async inicializarVariableSimple(nodo, entorno) {
        const simbolo = entorno.getVariable(nodo.id);
        if (!simbolo || simbolo.valor !== null) return;

        if (this.dependeDeQueryPendiente(nodo.valor, entorno)) {
            this.variablesDependientesDeQuery.push({ nodo, entorno });
            return;
        }

        const valorResuelto = await this.resolverExpresionSimple(nodo.valor, entorno);
        if (!valorResuelto) return;

        if (!this.sonTiposCompatibles(nodo.tipado, valorResuelto.tipo)) {
            this.compilador.agregarError(
                this.modulo.nombre, nodo.id, 'Semantico',
                `Tipo incompatible: no se puede asignar ${valorResuelto.tipo} a '${nodo.id}' de tipo ${nodo.tipado}.`,
                nodo.linea, nodo.columna
            );
            return;
        }

        simbolo.valor = valorResuelto.valor;
    }

    /*Metodo que permite validar si es una variable que depende de arreglo*/
    dependeDeQueryPendiente(nodo, entorno) {
        if (!nodo) return false;

        if (nodo.tipo === 'ACCESO_ARREGLO') {
            const arreglo = entorno.getVariable(nodo.valor || nodo.id);
            if (arreglo && arreglo.esArreglo && arreglo.esperandoRespuestaBD) {
                return true;
            }
        }

        if (nodo.izq && this.dependeDeQueryPendiente(nodo.izq, entorno)) return true;
        if (nodo.der && this.dependeDeQueryPendiente(nodo.der, entorno)) return true;

        return false;
    }

    /*Metodo qu permite inicializar un arreglo vacio */
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

    /*Metodo que permite inicializar un arreglo con valores */
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

    /*Metodo que permite inicializar un arreglo con una query */
    async inicializarArregloQuery(nodo, entorno) {
        const simbolo = entorno.getVariable(nodo.id);
        if (!simbolo) {
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

        if (simbolo.valor !== null) {
            this.compilador.agregarError(
                this.modulo.nombre,
                nodo.id,
                'Semantico',
                `Ya tiene valor: '${simbolo.valor}' no definida.`,
                nodo.linea,
                nodo.columna
            );
            return;
        }

        const queryStr = this.resolverQueryTemplate(nodo.query, entorno);

        if (!queryStr) {
            this.compilador.agregarError(
                this.modulo.nombre,
                nodo.id,
                'Semantico',
                `No se pudo armar el query string`,
                nodo.linea,
                nodo.columna
            );
            simbolo.valor = [];
            simbolo.tamano = 0;
            return;
        }

        simbolo.queryPendiente = queryStr;
        simbolo.valor = [];
        simbolo.tamano = 0;
        simbolo.esperandoRespuestaBD = true;

        this.simbolosPendientesBD.push(simbolo);

    }

    /*Metodo que permite resolver las expresiones */
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
                        `Indice ${indice.valor} fuera de límites [0-${arreglo.valor.length - 1}].`,
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
        const esAmbitoGlobal = (entornoActual === this.modulo.tablaSimbolos);

        if (nodo.tipo === 'LOAD_ARCHIVO') {
            if (esAmbitoGlobal) {
                const infoRuta = await this.resolverExpresionSimple(nodo.uri, entornoActual);

                if (!infoRuta) {
                    return;
                }

                if (infoRuta.tipo !== 'CADENA' || !infoRuta.valor) {
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
            } else {
                if (nodo.uri && nodo.uri.tipo === 'VALOR_CADENA') {
                    this.loadsDetectados.push({
                        ruta: nodo.uri.valor.trim(),
                        linea: nodo.linea,
                        columna: nodo.columna
                    });
                }
                
                const tipoExpresion = await this.obtenerTipoExpresion(nodo.uri, entornoActual);
                if (!tipoExpresion) return;
                if (tipoExpresion !== 'CADENA') {
                    this.compilador.agregarError(
                        this.modulo.nombre, "load", 'Semantico',
                        `El LOAD requiere una expresión tipo STRING, pero se encontró '${tipoExpresion}'.`,
                        nodo.linea, nodo.columna
                    );
                }
            }
        }
        else if (nodo.tipo === 'LOAD_ID') {
            let variable = entornoActual.getVariable(nodo.id);

            if (!variable) {
                variable = this.modulo.tablaSimbolos.getVariable(nodo.id);
            }

            if (!variable) {
                this.compilador.agregarError(
                    this.modulo.nombre,
                    nodo.id,
                    'Semantico',
                    `Variable '${nodo.id}' usada en LOAD no está definida en ningún ámbito.`,
                    nodo.linea,
                    nodo.columna
                );
                return;
            }

            if (variable.tipoDato !== 'CADENA') {
                this.compilador.agregarError(
                    this.modulo.nombre,
                    nodo.id,
                    'Semantico',
                    `LOAD requiere una variable tipo STRING, pero '${nodo.id}' es de tipo ${variable.tipoDato}.`,
                    nodo.linea,
                    nodo.columna
                );
                return;
            }

            if (esAmbitoGlobal && variable.valor !== null && variable.valor !== undefined) {
                this.loadsDetectados.push({
                    ruta: variable.valor.trim(),
                    linea: nodo.linea,
                    columna: nodo.columna
                });
            }
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

    /*Metodo que permite obtener SOLO el tipo de una expresión sin resolver su valor */
    async obtenerTipoExpresion(nodo, entorno) {
        if (!nodo) return null;

        switch (nodo.tipo) {
            case 'INT':
                return 'ENTERA';
            case 'FLOAT':
                return 'FLOAT';
            case 'VALOR_CADENA':
                return 'CADENA';
            case 'CHAR':
                return 'CARACTER';
            case 'BOOL':
                return 'BOOLEANA';

            case 'ID':
                let variable = entorno.getVariable(nodo.valor);
                if (!variable) {
                    variable = this.modulo.tablaSimbolos.getVariable(nodo.valor);
                }

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

                return variable.tipoDato;

            case 'ACCESO_ARREGLO':
                let arreglo = entorno.getVariable(nodo.valor || nodo.id);
                if (!arreglo) {
                    arreglo = this.modulo.tablaSimbolos.getVariable(nodo.valor || nodo.id);
                }

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

                return arreglo.tipoDato;

            case 'ARITMETICA':
                const tipoIzq = await this.obtenerTipoExpresion(nodo.izq, entorno);
                const tipoDer = await this.obtenerTipoExpresion(nodo.der, entorno);

                if (!tipoIzq || !tipoDer) return null;

                if (tipoIzq === 'FLOAT' || tipoDer === 'FLOAT') return 'FLOAT';
                if (tipoIzq === 'CADENA' || tipoDer === 'CADENA') return 'CADENA';
                return 'ENTERA';

            case 'UNARIA':
                if (nodo.op === 'NEGATIVO') {
                    return await this.obtenerTipoExpresion(nodo.der, entorno);
                }
                if (nodo.op === 'NOT') {
                    return 'BOOLEANA';
                }
                return null;

            case 'RELACIONAL':
            case 'LOGICA':
                return 'BOOLEANA';

            default:
                return null;
        }
    }

}