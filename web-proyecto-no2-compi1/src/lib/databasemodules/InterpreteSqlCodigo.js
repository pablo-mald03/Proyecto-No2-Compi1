/*Imports de la clase */
import parserDatabase from "$lib/analizador/compiler/database-config";

import { AnalizadorSemanticoSql } from "./AnalizadorSemanticoSql";

import { ResultadoTipado } from "$lib/modules/ResultadoTipado";
/*Clase delegada para poderse comunicar con el parser para ejecutar los comandos SQL*/
export class InterpreteSqlCodigo {

    constructor(dbManejador) {
        this.validador = new AnalizadorSemanticoSql(dbManejador);
        this.db = dbManejador;
    }

    /**
    * Metodo utilizado para generar la comunicacion con el parser de los comandos sql
    *  
    * @param {string} comando 
    * @param {Object} fs 
    */
    traducirSql(comando) {

        parserDatabase.yy.errores = [];

        let ast;
        try {
            ast = parserDatabase.parse(comando);

            if (parserDatabase.yy.errores && parserDatabase.yy.errores.length > 0) {
                return {
                    exito: false,
                    errores: parserDatabase.yy.errores,
                    mensajeGeneral: "Errores sintacticos o lexicos encontrados."
                };
            }
        } catch (error) {
            return {
                exito: false,
                errores: parserDatabase.yy.errores.length > 0 ? parserDatabase.yy.errores : [{ tipo: 'Fatal', descripcion: error.message }],
                mensajeGeneral: "Error fatal en el analisis de la instruccion."
            };
        }

        const resultadoValidacion = this.validador.validar(ast);

        if (resultadoValidacion.erroresEncontrados.length > 0) {
            return {
                exito: false,
                errores: resultadoValidacion.erroresEncontrados,
                mensajeGeneral: "Se encontraron errores semanticos encontrados."
            };
        }

        const astProcesado = resultadoValidacion.astProcesado;

        let sentenciasSql = [];
        for (const nodo of astProcesado) {
            if (nodo) {
                sentenciasSql.push(this.procesarNodo(nodo));
            }
        }

        return {
            exito: true,
            sql: sentenciasSql,
            errores: []
        };
    }


    /*Metodo que permite retornar el parser*/
    getParser() {
        return this.parserDatabase
    }

    /*Metodo que permite recorrer el AST que retorna el parser */
    procesarNodo(nodo) {
        switch (nodo.accion) {
            case 'CREATE':
                const definiciones = nodo.columnas.map(col => `${col.id} ${col.tipo}`).join(', ');
                return `CREATE TABLE IF NOT EXISTS ${nodo.tabla} (id INTEGER PRIMARY KEY AUTOINCREMENT, ${definiciones});`;

            case 'SELECT_COL':
                return `SELECT ${nodo.columna} FROM ${nodo.tabla};`;

            case 'INSERT':
                const columnasInsert = nodo.valores.map(v => v.col).join(', ');
                const valoresInsert = nodo.valores
                    .map(v => this.formatearValor(v.valor))
                    .join(', ');
                return `INSERT INTO ${nodo.tabla} (${columnasInsert}) VALUES (${valoresInsert});`;

            case 'UPDATE':
                const asignaciones = nodo.valores
                    .map(v => `${v.col} = ${this.formatearValor(v.valor)}`)
                    .join(', ');
                return `UPDATE ${nodo.tabla} SET ${asignaciones} WHERE id = ${nodo.id};`;

            case 'DELETE':
                return `DELETE FROM ${nodo.tabla} WHERE id = ${nodo.id};`;

            default:
                throw new Error(`Accion no reconocida en el lenguaje ${nodo.accion}`);
        }
    }

    /*Metodo utilizado para poder encerrar dentro de comillas los strings */
    formatearValor(valorObj) {
        if (valorObj.col === 'STRING') {
            const limpio = String(valorObj.valor).replace(/'/g, "''");
            return `'${limpio}'`;
        }
        return valorObj.valor;
    }


    /*Metodo que permite leer el AST directamente*/
    async ejecutarCodigo(comando) {
        parserDatabase.yy.errores = [];
        let ast;

        try {
            ast = parserDatabase.parse(comando);
            if (parserDatabase.yy.errores && parserDatabase.yy.errores.length > 0) {
                return { exito: false, errores: parserDatabase.yy.errores };
            }
        } catch (error) {
            return { exito: false, errores: [{ tipo: 'Fatal', descripcion: error.message }] };
        }

        const resultadoValidacion = this.validador.validar(ast);
        if (resultadoValidacion.erroresEncontrados.length > 0) {
            return { exito: false, errores: resultadoValidacion.erroresEncontrados };
        }

        let resultados = [];
        for (const nodo of resultadoValidacion.astProcesado) {
            if (nodo) {
                const res = await this.procesarNodoRequest(nodo);
                resultados.push(res);
            }
        }

        return { exito: true, resultados: resultados, errores: [] };
    }

    /* Metodo que valida que es una query sin ejecutarla */
    validarAccion(comando) {
        parserDatabase.yy.errores = [];
        let ast;

        try {
            ast = parserDatabase.parse(comando);
            if (parserDatabase.yy.errores && parserDatabase.yy.errores.length > 0) {
                return {
                    esSelect: false,
                    accion: null,
                    error: parserDatabase.yy.errores[0].descripcion
                };
            }
        } catch (error) {
            return {
                esSelect: false,
                accion: null,
                error: error.message
            };
        }

        const resultadoValidacion = this.validador.validar(ast);

        if (resultadoValidacion.erroresEncontrados.length > 0) {
            return {
                esSelect: false,
                accion: null,
                error: resultadoValidacion.erroresEncontrados[0].descripcion
            };
        }

        const nodo = resultadoValidacion.astProcesado[0];
        const accion = nodo ? nodo.accion : null;

        return {
            esSelect: accion === 'SELECT_COL',
            accion: accion,
            error: null
        };
    }

    /*Metodo que permite ejecutar cada nodo del AST parseado para poder generar las querys*/
    async procesarNodoRequest(nodo) {
        switch (nodo.accion) {
            case 'SELECT_COL': {
                const query = `SELECT ${nodo.columna} FROM ${nodo.tabla};`;
                const resultado = this.db.execute(query);

                const valoresColumna = [];
                if (resultado.length > 0 && resultado[0].values) {
                    for (const row of resultado[0].values) {
                        valoresColumna.push(row[0]);
                    }
                }

                const res = new ResultadoTipado(valoresColumna);
                res.accion = 'SELECT_COL';
                res.tabla = nodo.tabla;
                res.columna = nodo.columna;
                return res;
            }

            case 'INSERT': {
                const columnas = nodo.valores.map(v => v.col).join(', ');
                const valores = nodo.valores
                    .map(v => this.formatearValor(v.valor))
                    .join(', ');

                this.db.execute(`INSERT INTO ${nodo.tabla} (${columnas}) VALUES (${valores});`);

                const res = new ResultadoTipado([]);
                res.accion = 'INSERT';
                res.mensaje = `Registro insertado en ${nodo.tabla}`;
                return res;
            }

            case 'UPDATE': {
                const asignaciones = nodo.valores
                    .map(v => `${v.col} = ${this.formatearValor(v.valor)}`)
                    .join(', ');

                this.db.execute(`UPDATE ${nodo.tabla} SET ${asignaciones} WHERE id = ${nodo.id};`);

                const res = new ResultadoTipado([]);
                res.accion = 'UPDATE';
                res.mensaje = `Registro ${nodo.id} actualizado en ${nodo.tabla}`;
                return res;
            }

            case 'DELETE': {
                this.db.execute(`DELETE FROM ${nodo.tabla} WHERE id = ${nodo.id};`);

                const res = new ResultadoTipado([]);
                res.accion = 'DELETE';
                res.mensaje = `Registro ${nodo.id} eliminado de ${nodo.tabla}`;
                return res;
            }

            case 'CREATE': {
                const definiciones = nodo.columnas
                    .map(col => `${col.id} ${col.tipo}`)
                    .join(', ');
                this.db.execute(`CREATE TABLE IF NOT EXISTS ${nodo.tabla} (id INTEGER PRIMARY KEY AUTOINCREMENT, ${definiciones});`);

                const res = new ResultadoTipado([]);
                res.accion = 'CREATE';
                res.mensaje = `Tabla ${nodo.tabla} creada`;
                return res;
            }

            default:
                throw new Error(`Acción no reconocida: ${nodo.accion}`);
        }
    }

    /*Metodo que permite extraer el valor y poder guardarlo*/
    extraerValorReal(valorObj) {
        let valor = valorObj.valor;

        switch (valorObj.col) {
            case 'INT':
                return parseInt(valor, 10);
            case 'FLOAT':
                return parseFloat(valor);
            case 'BOOLEAN':
                return valor === 'true' || valor === true;
            case 'STRING':
            case 'CHAR':
                if (typeof valor === 'string' && valor.startsWith("'") && valor.endsWith("'")) {
                    return valor.slice(1, -1);
                }
                return String(valor);
            default:
                return valor;
        }
    }

}