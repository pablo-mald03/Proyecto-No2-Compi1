/*Imports de la clase */
import parserDatabase from "$lib/analizador/compiler/database-config";

/*Clase delegada para poderse comunicar con el parser para ejecutar los comandos SQL*/
export class InterpreteSqlCodigo {


    /**
    * Metodo utilizado para generar la comunicacion con el parser de los comandos sql
    *  
    * @param {string} comando 
    * @param {Object} fs 
    */
    traducirASql(comando, fs) {
        parserYferaTerminal.yy.errores = [];

        let ast;
        try {
            ast = parserYferaTerminal.parse(comando);

            if (parserYferaTerminal.yy.errores && parserYferaTerminal.yy.errores.length > 0) {
                fs.notificarErrores(parserYferaTerminal.yy.errores);
                return {
                    exito: false,
                    error: "Se encontraron errores. Revisa el panel de errores."
                };
            }

        } catch (error) {
            const erroresFallback = parserYferaTerminal.yy.errores.length > 0
                ? parserYferaTerminal.yy.errores
                : [{
                    lexema: "N/A", tipo: "Fatal", fila: -1, columna: -1, descripcion: error.message
                }];

            fs.notificarErrores(erroresFallback);
            return { 
                exito: false, 
                error: "Error critico de sintaxis." };
        }

        if (ast && ast.length > 0) {
            let sentenciasSql = [];

            for (const instruccion of ast) {
                if (instruccion) {
                    const sql = this.procesarNodo(instruccion);
                    if (sql) sentenciasSql.push(sql);
                }
            }

            return { exito: true, sql: sentenciasSql.join('\n') };
        }

        return { exito: false, error: "Comando vacio o no reconocido." };
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
                throw new Error(`Acción no reconocida en el lenguaje ${nodo.accion}`);
        }
    }

}