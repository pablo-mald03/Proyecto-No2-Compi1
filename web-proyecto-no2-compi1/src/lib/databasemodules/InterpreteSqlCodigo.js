/*Imports de la clase */
import parserDatabase from "$lib/analizador/compiler/database-config";

import { AnalizadorSemanticoSql } from "./AnalizadorSemanticoSql";

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

    /*Metodo que permite ejecutar cada nodo del AST parseado para poder generar las querys*/
    async procesarNodoRequest(nodo) {
        switch (nodo.accion) {
            case 'SELECT_COL':
                const registros = await this.db[nodo.tabla].toArray();

                const valoresColumna = registros.map(fila => fila[nodo.columna]);
                
                return new ResultadoTipado(valoresColumna);

            case 'INSERT':
                let nuevoRegistro = {};
                nodo.valores.forEach(v => {
                    nuevoRegistro[v.col] = this.extraerValorReal(v.valor); 
                });

                await this.db[nodo.tabla].add(nuevoRegistro);
                return { mensaje: `Registro insertado en ${nodo.tabla}`, accion: 'INSERT' };

            case 'UPDATE':
                let cambios = {};
                nodo.valores.forEach(v => {
                    cambios[v.col] = this.extraerValorReal(v.valor);
                });

                await this.db[nodo.tabla].update(nodo.id, cambios);
                return { mensaje: `Registro ${nodo.id} actualizado`, accion: 'UPDATE' };

            case 'DELETE':
                await this.db[nodo.tabla].delete(nodo.id);
                return { mensaje: `Registro ${nodo.id} eliminado`, accion: 'DELETE' };

            case 'CREATE':
                return { 
                    mensaje: "Para CREATE en Dexie, se requiere actualizar db.version().stores()", 
                    accion: 'CREATE', 
                    nodo: nodo 
                };

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