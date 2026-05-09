/*Clase delegada para poder ejecutar la accion de convertir una query a lenguaje sql */

export class TranspiladorSql {

    constructor() {
    }

    /*Metodo que permite generar la transpilacion del codigo parseado */
    transpilarAst(ast) {
        const sentenciasSql = [];
        for (const nodo of ast) {
            if (nodo) {
                sentenciasSql.push(this.transpilarNodo(nodo));
            }
        }
        return sentenciasSql;
    }

    /*Metodo que permite determinar a cual sentencia se va a transpilar el codigo*/
     transpilarNodo(nodo) {
        switch (nodo.accion) {
            case 'CREATE':
                return this.transpilarCreate(nodo);

            case 'SELECT_COL':
                return this.transpilarSelectCol(nodo);

            case 'INSERT':
                return this.transpilarInsert(nodo);

            case 'UPDATE':
                return this.transpilarUpdate(nodo);

            case 'DELETE':
                return this.transpilarDelete(nodo);

            default:
                throw new Error(`Acción no reconocida en transpilación: ${nodo.accion}`);
        }
    }

    /*Metodo que permite crear la sentencia sql de create database*/
    transpilarCreate(nodo) {
        const definiciones = nodo.columnas
            .map(col => `${col.id} ${col.tipo}`)
            .join(', ');
        return `CREATE TABLE IF NOT EXISTS ${nodo.tabla} (id INTEGER PRIMARY KEY AUTOINCREMENT, ${definiciones});`;
    }

    /*Metodo que permite crear la sentencia de selecionar una columna*/
    transpilarSelectCol(nodo) {
        return `SELECT ${nodo.columna} FROM ${nodo.tabla};`;
    }

    /*Metodo que permite transpilar el codigo a un insert*/
    transpilarInsert(nodo) {
        const columnas = nodo.valores.map(v => v.col).join(', ');
        const valoresJs = nodo.valores
            .map(v => this.transpilarExpresionJavaScript(v.valor))
            .join(', ');
        return `INSERT INTO ${nodo.tabla} (${columnas}) VALUES (${valoresJs});`;
    }

    /*Metodo que permite transpilar el codigo a un update*/
    transpilarUpdate(nodo) {
        const asignaciones = nodo.valores
            .map(v => `${v.col} = ${this.transpilarExpresionJavaScript(v.valor)}`)
            .join(', ');
        const condicionId = this.transpilarExpresionJavaScript(nodo.id);
        return `UPDATE ${nodo.tabla} SET ${asignaciones} WHERE id = ${condicionId};`;
    }

    /*Metodo que permie transpilar el codigo a un delete*/
    transpilarDelete(nodo) {
        const condicionId = this.transpilarExpresionJavaScript(nodo.id);
        return `DELETE FROM ${nodo.tabla} WHERE id = ${condicionId};`;
    }

    /*Metodo delegado para poder transpilar las expresiones a codigo javascript*/
    transpilarExpresionJavaScript(expr) {
        if (!expr || typeof expr !== 'object') {
            return String(expr);
        }

        switch (expr.tipo) {
            case 'VALOR':
                return this.transpilarValor(expr);

            case 'ID':
                return this.transpilarIdentificador(expr);

            case 'OPERACION':
                return this.transpilarOperacionBinaria(expr);

            case 'OPERACION_UNARIA':
                return this.transpilarOperacionUnaria(expr);

            default:
                throw new Error(`Tipo de expresion no reconocido: ${expr.tipo}`);
        }
    }

    /*Metodo que permite convertir un valor a sql*/
    transpilarValor(valor) {
        switch (valor.tipo_dato) {
            case 'STRING':
                const stringLimpio = String(valor.valor)
                    .replace(/\\/g, '\\\\')
                    .replace(/'/g, "\\'")
                    .replace(/"/g, '\\"')
                    .replace(/\n/g, '\\n')
                    .replace(/\r/g, '\\r');
                return `'${stringLimpio}'`;

            case 'NUMERO':
                return Number(valor.valor).toString();

            default:
                return String(valor.valor);
        }
    }

    /*Metodo que permite transpilar un identificador para poderlo agregar  a expreiones*/
    transpilarIdentificador(expr) {
        let nombreVariable = expr.valor;
        if (nombreVariable.startsWith('$')) {
            nombreVariable = nombreVariable.substring(1);
        }
        return nombreVariable;
    }

    /*Metodo que permite transpilar expresiones matematicas*/
    transpilarOperacionBinaria(expr) {
        const izq = this.transpilarExpresionJavaScript(expr.izq);
        const der = this.transpilarExpresionJavaScript(expr.der);
        const operadorJs = this.mapearOperadorJavaScript(expr.operador);

        // Solo poner paréntesis si es necesario para mantener la precedencia
        return `(${izq} ${operadorJs} ${der})`;
    }
    /*Metodo que permite transpilar valores unarios*/
    transpilarOperacionUnaria(expr) {
        const valor = this.transpilarExpresionJavaScript(expr.valor || expr.operando);
        const operadorJs = this.mapearOperadorUnarioJavaScript(expr.operador);
        return `${operadorJs}(${valor})`;
    }


    /*Metodo que permite mapear el operador matematico correspondiente*/
    mapearOperadorJavaScript(operador) {
        const mapa = {
            'MAS': '+',
            'MENOS': '-',
            'MULTIPLICACION': '*',
            'DIVISION': '/',
            'MODULO': '%',
            'MAYOR': '>',
            'MENOR': '<',
            'MAYOR_IGUAL': '>=',
            'MENOR_IGUAL': '<=',
            'IGUALACION': '===',
            'DIFERENTE': '!==',
            'OR': '||',
            'AND': '&&'
        };
        return mapa[operador] || operador;
    }


    /*Metodo que mapea el operador unario*/
    mapearOperadorUnarioJavaScript(operador) {
        const mapa = {
            'MENOS_UNARIO': '-',
            'NOT': '!'
        };
        return mapa[operador] || operador;
    }
}