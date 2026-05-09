/*Clase delegada para poder ejecutar la accion de convertir una query a lenguaje sql */

export class TranspiladorSql {

    constructor() {
    }

    transpilarAst(ast) {
        const sentenciasSql = [];
        for (const nodo of ast) {
            if (nodo) {
                sentenciasSql.push(this.transpilarNodo(nodo));
            }
        }
        return sentenciasSql;
    }

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

    transpilarCreate(nodo) {
        const definiciones = nodo.columnas
            .map(col => `${col.id} ${col.tipo}`)
            .join(', ');
        return `CREATE TABLE IF NOT EXISTS ${nodo.tabla} (id INTEGER PRIMARY KEY AUTOINCREMENT, ${definiciones});`;
    }

    transpilarSelectCol(nodo) {
        return `SELECT ${nodo.columna} FROM ${nodo.tabla};`;
    }

    transpilarInsert(nodo) {
        const columnas = nodo.valores.map(v => v.col).join(', ');
        const valoresJs = nodo.valores
            .map(v => this.transpilarExpresionJavaScript(v.valor))
            .join(', ');
        return `INSERT INTO ${nodo.tabla} (${columnas}) VALUES (${valoresJs});`;
    }

    transpilarUpdate(nodo) {
        const asignaciones = nodo.valores
            .map(v => `${v.col} = ${this.transpilarExpresionJavaScript(v.valor)}`)
            .join(', ');
        const condicionId = this.transpilarExpresionJavaScript(nodo.id);
        return `UPDATE ${nodo.tabla} SET ${asignaciones} WHERE id = ${condicionId};`;
    }

    transpilarDelete(nodo) {
        const condicionId = this.transpilarExpresionJavaScript(nodo.id);
        return `DELETE FROM ${nodo.tabla} WHERE id = ${condicionId};`;
    }

    /* LO IMPORTANTE: transpilar las expresiones a código JavaScript para template strings */
    transpilarExpresionJavaScript(expr) {
        if (!expr || typeof expr !== 'object') {
            return String(expr);
        }

        switch (expr.tipo) {
            case 'VALOR':
                // Valores literales se ponen directamente
                return this.transpilarValor(expr);

            case 'ID':
                // Variables se ponen como ${variable} para que JS las evalúe
                return this.transpilarIdentificador(expr);

            case 'OPERACION':
                // Operaciones matemáticas se dejan como expresión JS
                return this.transpilarOperacionBinaria(expr);

            case 'OPERACION_UNARIA':
                return this.transpilarOperacionUnaria(expr);

            default:
                throw new Error(`Tipo de expresion no reconocido: ${expr.tipo}`);
        }
    }

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
                return String(valor.valor);

            default:
                return String(valor.valor);
        }
    }

    /* Metodo que permite retornar un identificador fomateado*/
    transpilarIdentificador(expr) {
        let nombreVariable = expr.valor;
        if (nombreVariable.startsWith('$')) {
            nombreVariable = nombreVariable.substring(1);
        }
        return `\$\{${nombreVariable}\}`;
    }

    /*Metodo que permite mapear una operacion binaria en el codigo compilado */
    transpilarOperacionBinaria(expr) {
        const izq = this.transpilarExpresionJavaScript(expr.izq);
        const der = this.transpilarExpresionJavaScript(expr.der);
        const operadorJs = this.mapearOperadorJavaScript(expr.operador);

        // Devolver como template string: ${(expresion)}
        return `\$\{(${izq} ${operadorJs} ${der})\}`;
    }

    /*Metodo que permite mapear una operacion unaraia en el codigo compilado */
    transpilarOperacionUnaria(expr) {
        const valor = this.transpilarExpresionJavaScript(expr.valor || expr.operando);
        const operadorJs = this.mapearOperadorUnarioJavaScript(expr.operador);
        return `\$\{${operadorJs}(${valor})\}`;
    }

    /*Metodo que permite mapear un operador en el codigo compilado */
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

    mapearOperadorUnarioJavaScript(operador) {
        const mapa = {
            'MENOS_UNARIO': '-',
            'NOT': '!'
        };
        return mapa[operador] || operador;
    }
}