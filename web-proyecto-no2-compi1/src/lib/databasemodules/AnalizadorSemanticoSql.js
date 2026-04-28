
/*Clase delegada para poder hacer el analisis semantico del lenguaje sql */

export class AnalizadorSemanticoSql {

    constructor(dbManejador) {
        this.db = dbManejador;
        this.errores = [];
    }


    /*Metodo que permite recorrer el AST para poder validarlo */
    validar(ast) {
        this.errores = [];

        let nuevoAst = [];

        for (const nodo of ast) {
            const nodoNuevo = this.analizarNodo(nodo);
            if (nodoNuevo) {
                nuevoAst.push(nodoNuevo);
            }
        }

        return {
            astProcesado: nuevoAst,
            erroresEncontrados: this.errores
        };
    }

    /* Metodo utilizado para analizar cada nodo que viene del AST */
    analizarNodo(nodo) {
        if (!nodo) return null;

        switch (nodo.accion) {
            case 'CREATE':
                return this.validarCreate(nodo);
            case 'INSERT':
                return this.validarInsert(nodo);
            case 'UPDATE':
                return this.validarUpdate(nodo);
            case 'DELETE':
                return this.validarDelete(nodo);
            case 'SELECT_COL':
                return this.validarSelect(nodo);
        }
        return null;
    }

    /*Metodo que permite evaluar si existe la tabla y la columna a buscar */
    validarSelect(nodo) {

        const infoTabla = this.db.execute(`PRAGMA table_info(${nodo.tabla});`);

        if (!infoTabla || infoTabla.length === 0) {
            this.agregarError(
                nodo.tabla,
                "Semantico",
                `La tabla '${nodo.tabla}' no existe.`,
                nodo.loc_linea,
                nodo.loc_columna
            );
            return null;
        }

        const columnasBD = infoTabla[0].values;

        const existeColumna = columnasBD.some(c => c[1] === nodo.columna);

        if (!existeColumna) {
            this.agregarError(
                nodo.columna,
                "Semantico",
                `La columna '${nodo.columna}' no existe en la tabla '${nodo.tabla}'.`,
                nodo.loc_linea,
                nodo.loc_columna
            );
            return null;
        }

        return {
            accion: 'SELECT_COL',
            tabla: nodo.tabla,
            columna: nodo.columna
        };
    }

    /*Metodo que permite validar el metodo de crear tabla */
    validarCreate(nodo) {

        if (!nodo.columnas || nodo.columnas.length === 0) {
            this.agregarError(`TABLE ${nodo.tabla}`, "Semantico", `La tabla '${nodo.tabla}' debe tener al menos una columna.`, nodo.loc_linea, nodo.loc_columna);
            return null;
        }

        const nombres = new Set();

        let hayErrores = false;

        for (const col of nodo.columnas) {
            if (nombres.has(col.id)) {
                this.agregarError(col.id, "Semantico", `La columna '${col.id}' esta duplicada en la definición de la tabla.`, nodo.loc_linea, nodo.loc_columna);
                hayErrores = true;
            }
            nombres.add(col.id);
        }

        if (hayErrores === true) {
            return null;
        }

        return {
            accion: 'CREATE',
            tabla: nodo.tabla,
            columnas: nodo.columnas,
        };
    }

    /*Metodo que permite validar un Update */
    validarUpdate(nodo) {

        const resultado = this.resolverExpresion(nodo.id);

        if (!resultado) return null;

        if (resultado.tipo_dato !== 'NUMERO') {
            this.agregarError(
                String(resultado.valor),
                "Semantico",
                `El ID en UPDATE debe ser numérico.`,
                nodo.loc_linea,
                nodo.loc_columna
            );
            return null;
        }

        const idEvaluado = resultado.valor;

        const existeRegistro = this.verificarIdExiste(nodo.tabla, idEvaluado);

        if (!existeRegistro) {
            this.agregarError(
                `ID: ${idEvaluado}`,
                "Semantico",
                `No se puede actualizar: El registro con ID ${idEvaluado} no existe en la tabla '${nodo.tabla}'.`,
                nodo.loc_linea,
                nodo.loc_columna
            );
            return null;
        }

        const nodoNormalizado = this.validarInsert(nodo);

        if (!nodoNormalizado) return null;

        return {
            accion: 'UPDATE',
            tabla: nodo.tabla,
            id: idEvaluado,
            valores: nodo.valores
        };
    }


    /*Metodo que permite validar el Delete */
    validarDelete(nodo) {

        const infoTabla = this.db.execute(`PRAGMA table_info(${nodo.tabla});`);
        if (!infoTabla || infoTabla.length === 0) {
            this.agregarError(nodo.tabla, "Semantico", `La tabla '${nodo.tabla}' no existe.`, nodo.loc_linea, nodo.loc_columna);
            return null;
        }

        const resultado = this.resolverExpresion(nodo.id);

        if (!resultado) return null;

        if (resultado.tipo_dato !== 'NUMERO') {
            this.agregarError(
                String(resultado.valor),
                "Semantico",
                `El ID en DELETE debe ser numérico.`,
                nodo.loc_linea,
                nodo.loc_columna
            );
            return null;
        }

        const idEvaluado = resultado.valor;

        if (!this.verificarIdExiste(nodo.tabla, idEvaluado)) {
            this.agregarError(
                `DELETE ${idEvaluado}`,
                "Semantico",
                `No existe el registro ${idEvaluado} en la tabla '${nodo.tabla}'.`,
                nodo.loc_linea,
                nodo.loc_columna
            );
            return null;
        }

        return {
            accion: 'DELETE',
            tabla: nodo.tabla,
            id: idEvaluado
        };

    }

    /*Metodo que permite comprobar si el id existe en la tabla */
    verificarIdExiste(tabla, id) {
        try {
            const res = this.db.execute(`SELECT 1 FROM ${tabla} WHERE id = ${id};`);
            return res && res.length > 0 && res[0].values.length > 0;
        } catch (e) {
            return false;
        }
    }

    /*Metodo que permite validar el metodo de crear tabla */
    validarInsert(nodo) {
        try {

            let hayErrores = false;

            const infoTabla = this.db.execute(`PRAGMA table_info(${nodo.tabla});`);

            if (!infoTabla || infoTabla.length === 0) {
                this.agregarError(`${nodo.tabla}`, "Semantico", `La tabla '${nodo.tabla}' no existe.`, nodo.loc_linea, nodo.loc_columna);
                return null;
            }

            const columnasBD = infoTabla[0].values;

            for (let i = 0; i < nodo.valores.length; i++) {
                const valorInsert = nodo.valores[i];
                const colInfo = columnasBD.find(c => c[1] === valorInsert.col);

                if (!colInfo) {
                    this.agregarError(valorInsert.col, "Semantico", `La columna '${valorInsert.col}' no existe en '${nodo.tabla}'.`, valorInsert.loc_linea, valorInsert.loc_columna);
                    hayErrores = true;
                    continue;
                }

                const resultadoEvaluado = this.resolverExpresion(valorInsert.valor);

                if (!resultadoEvaluado) continue;

                const tipoEsperado = colInfo[2].toUpperCase();
                let tipoRecibido = resultadoEvaluado.tipo_dato;

                if (tipoEsperado.includes('INT') && tipoRecibido === 'BOOLEAN') {
                    resultadoEvaluado.valor = resultadoEvaluado.valor ? 1 : 0;
                    tipoRecibido = 'NUMERO';
                }

                if (tipoEsperado.includes('INT') && tipoRecibido !== 'NUMERO') {
                    this.agregarError(
                        String(resultadoEvaluado.valor),
                        "Semantico",
                        `Incompatibilidad de tipos en '${valorInsert.col}'. Se esperaba INTEGER pero se recibió ${tipoRecibido}.`,
                        valorInsert.loc_linea,
                        valorInsert.loc_columna
                    );
                }

                else if ((tipoEsperado.includes('TEXT') || tipoEsperado.includes('VARCHAR')) && tipoRecibido !== 'STRING') {
                    this.agregarError(
                        String(resultadoEvaluado.valor),
                        "Semantico",
                        `Incompatibilidad de tipos en '${valorInsert.col}'. Se esperaba texto pero se recibio ${tipoRecibido}.`,
                        valorInsert.loc_linea,
                        valorInsert.loc_columna
                    );
                }

                valorInsert.valor = {
                    tipo: 'VALOR',
                    col: resultadoEvaluado.tipo_dato,
                    valor: resultadoEvaluado.valor
                };
            }

            if (hayErrores === true) {
                return null;
            }

        } catch (e) {
            this.agregarError("Base de Datos", "Error de ejecucion", `No se pudo verificar el esquema de '${nodo.tabla}'.`);
        }

        return nodo;
    }

    /*Metodo que permite resolver las expresiones que vienen en el AST */
    resolverExpresion(expr) {
        if (!expr) return null;

        if (expr.tipo === 'VALOR') {
            if (expr.tipo_dato === 'BOOLEAN') {
                return { valor: expr.valor ? 1 : 0, tipo_dato: 'NUMERO' };
            }
            return { valor: expr.valor, tipo_dato: expr.tipo_dato };
        }

        if (expr.tipo === 'OPERACION_UNARIA') {
            const res = this.resolverExpresion(expr.valor);
            if (!res) return null;

            if (expr.operador === 'NOT') {

                const resultadoBooleano = !res.valor;
                return { valor: resultadoBooleano ? 1 : 0, tipo_dato: 'NUMERO' };
            }
            if (expr.operador === 'MENOS_UNARIO') {
                if (res.tipo_dato !== 'NUMERO') {
                    this.agregarError(expr.operador, "Semantico", "Solo se puede usar '-' con números.", expr.linea, expr.columna);
                    return null;
                }
                return { valor: -res.valor, tipo_dato: 'NUMERO' };
            }
        }

        if (expr.tipo === 'OPERACION') {
            const izq = this.resolverExpresion(expr.izq);
            const der = this.resolverExpresion(expr.der);

            if (!izq || !der) return null;

            switch (expr.operador) {
                case 'MAS':
                    const nuevoTipoMas = (izq.tipo_dato === 'STRING' || der.tipo_dato === 'STRING') ? 'STRING' : 'NUMERO';
                    return { valor: izq.valor + der.valor, tipo_dato: nuevoTipoMas };

                case 'MENOS':
                case 'MULTIPLICACION':
                case 'DIVISION':
                case 'MODULO':
                    if (izq.tipo_dato !== 'NUMERO' || der.tipo_dato !== 'NUMERO') {
                        this.agregarError(expr.operador, "Semantico", `Operacion matematica no valida entre ${izq.tipo_dato} y ${der.tipo_dato}`, expr.linea, expr.columna);
                        return null;
                    }
                    if (expr.operador === 'MENOS') return { valor: izq.valor - der.valor, tipo_dato: 'NUMERO' };
                    if (expr.operador === 'MULTIPLICACION') return { valor: izq.valor * der.valor, tipo_dato: 'NUMERO' };
                    if (expr.operador === 'DIVISION') {
                        if (der.valor === 0) {
                            this.agregarError(`${izq.valor} / ${der.valor}`, "Semantico", "Division por cero no permitida.", expr.linea, expr.columna);
                            return null;
                        }
                        return { valor: izq.valor / der.valor, tipo_dato: 'NUMERO' };
                    }
                    if (expr.operador === 'MODULO') return { valor: izq.valor % der.valor, tipo_dato: 'NUMERO' };
                    break;

                case 'MAYOR': return {
                    valor: (izq.valor > der.valor) ? 1 : 0,
                    tipo_dato: 'NUMERO'
                };
                case 'MENOR': return {
                    valor: (izq.valor < der.valor) ? 1 : 0,
                    tipo_dato: 'NUMERO'
                };
                case 'MAYOR_IGUAL': return {
                    valor: (izq.valor >= der.valor) ? 1 : 0,
                    tipo_dato: 'NUMERO'
                };
                case 'MENOR_IGUAL': return {
                    valor: (izq.valor <= der.valor) ? 1 : 0,
                    tipo_dato: 'NUMERO'
                };
                case 'IGUALACION': return {
                    valor: (izq.valor === der.valor) ? 1 : 0,
                    tipo_dato: 'NUMERO'
                };
                case 'DIFERENTE': return {
                    valor: (izq.valor !== der.valor) ? 1 : 0,
                    tipo_dato: 'NUMERO'
                };

                case 'AND': return {
                    valor: (izq.valor && der.valor) ? 1 : 0,
                    tipo_dato: 'NUMERO'
                };
                case 'OR': return {
                    valor: (izq.valor || der.valor) ? 1 : 0,
                    tipo_dato: 'NUMERO'
                };
            }
        }
        return null;
    }

    /*Metodo que permite agregar un error a la lista */
    agregarError(lexemaError, tipo, descripcion, fila = 1, columna = 1) {
        this.errores.push({
            origen: 'Comando SQL',
            lexema: lexemaError,
            tipo: tipo,
            fila: fila,
            columna: columna,
            descripcion: descripcion
        });
    }

}