/*Imports de la clase */
import parserDatabase from "$lib/analizador/compiler/database-config";

import { AnalizadorSemanticoSql } from "./AnalizadorSemanticoSql";

/*Clase delegada para poderse comunicar con el parser para ejecutar los comandos SQL*/
export class InterpreteSqlCodigo {

    constructor(dbManejador) {
        this.validador = new AnalizadorSemanticoSql(dbManejador);
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

}