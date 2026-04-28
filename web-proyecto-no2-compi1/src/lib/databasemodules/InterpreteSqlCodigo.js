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

        parserYferaTerminal.yy.errores = [];

        let ast;
        try {
            ast = parserYferaTerminal.parse(comando);

            if (parserYferaTerminal.yy.errores && parserYferaTerminal.yy.errores.length > 0) {
                return {
                    exito: false,
                    errores: parserYferaTerminal.yy.errores,
                    mensajeGeneral: "Errores sintacticos o lexicos encontrados."
                };
            }
        } catch (error) {
            return {
                exito: false,
                errores: parserYferaTerminal.yy.errores.length > 0 ? parserYferaTerminal.yy.errores : [{ tipo: 'Fatal', descripcion: error.message }],
                mensajeGeneral: "Error fatal en el analisis de la instruccion."
            };
        }

        const erroresSemanticos = this.validador.validar(ast);

        if (erroresSemanticos.length > 0) {
            return {
                exito: false,
                errores: erroresSemanticos,
                mensajeGeneral: "Errores semanticos encontrados. Revisa los comandos escritos."
            };
        }

        let sentenciasSql = [];
        for (const nodo of ast) {
            if (nodo) sentenciasSql.push(this.procesarNodo(nodo));
        }


        return {
            exito: true,
            sql: sentenciasSql.join('\n'),
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
                const valoresInsert = nodo.valores.map(v => this.evaluarExpresion(v.valor)).join(', ');
                return `INSERT INTO ${nodo.tabla} (${columnasInsert}) VALUES (${valoresInsert});`;

            case 'UPDATE':
                const asignaciones = nodo.valores.map(v => `${v.col} = ${this.evaluarExpresion(v.valor)}`).join(', ');
                return `UPDATE ${nodo.tabla} SET ${asignaciones} WHERE id = ${nodo.id};`;

            case 'DELETE':
                return `DELETE FROM ${nodo.tabla} WHERE id = ${nodo.id};`;

            default:
                throw new Error(`Accion no reconocida en el lenguaje ${nodo.accion}`);
        }
    }

    /*Metodo que permite traducir las expresiones o valores primitivos a strings en SQL */
    evaluarExpresion(expr) {
        if (!expr) return 'NULL';

        if (expr.tipo === 'VALOR') {
            return expr.tipo_dato === 'STRING' ? `'${expr.valor}'` : expr.valor;
        }

        if (expr.tipo === 'OPERACION') {
            const izq = this.evaluarExpresion(expr.izq);
            const der = this.evaluarExpresion(expr.der);
            const op = this.traducirOperador(expr.operador);
            return `${izq} ${op} ${der}`;
        }

        if (expr.tipo === 'OPERACION_UNARIA') {
            const val = this.evaluarExpresion(expr.valor);
            return expr.operador === 'MENOS_UNARIO' ? `-${val}` : `NOT ${val}`;
        }

        return String(expr);
    }

    /*Metodo que permite traducir el operador a lenguaje SQL */
    traducirOperador(opYfera) {
        const ops = {
            'MAS': '+',
            'MENOS': '-',
            'MULTIPLICACION': '*',
            'DIVISION': '/',
            'MODULO': '%',
            'MAYOR': '>',
            'MENOR': '<',
            'MAYOR_IGUAL': '>=',
            'MENOR_IGUAL': '<=',
            'IGUALACION': '=',
            'DIFERENTE': '!=',
            'OR': 'OR',
            'AND': 'AND'
        };
        return ops[opYfera] || opYfera;
    }

}