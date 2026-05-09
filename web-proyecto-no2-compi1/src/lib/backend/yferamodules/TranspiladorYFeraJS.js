import { TablaSimbolos } from "../semanticsyfera/TablaSimbolos";

import { InterpreteSqlCodigo } from "$lib/databasemodules/InterpreteSqlCodigo";

/*Clase delegada para poder generar el codigo compilado del archivo .y */

export class TranspiladorYFeraJS {

    constructor(compilador, manejadorDb) {
        this.compilador = compilador;
        this.manejadorDb = manejadorDb;
        this.contadorComponentes = 0;
    }


    /*Metodo principal que permite transpilar por completo todo el codigo .y a javascript*/
    async transpilarModulo(moduloYfera) {
        if (!moduloYfera || !moduloYfera.ast) return;

        const esModuloRaiz = moduloYfera.recursos.componentes.length > 0 ||
            moduloYfera.recursos.estilos.length > 0;

        let codigoJS = '';

        if (esModuloRaiz) {
            codigoJS += this.generarHTMLWrapper(moduloYfera,
                moduloYfera.ast.find(n => n.tipo === 'FUNCION_MAIN'),
                moduloYfera.tablaSimbolos,
                moduloYfera.tablaSimbolosComponentes);
        } else {
            codigoJS += this.transpilarVariablesGlobales(moduloYfera.ast, moduloYfera.tablaSimbolos);
            codigoJS += this.transpilarFunciones(moduloYfera.ast, moduloYfera.tablaSimbolos, moduloYfera.nombre);
            codigoJS += this.transpilarMain(moduloYfera.ast, moduloYfera.tablaSimbolos, moduloYfera.tablaSimbolosComponentes, moduloYfera);
        }

        moduloYfera.compiledYFera = codigoJS;

        for (const moduloHijo of moduloYfera.modulosHijos) {
            await this.transpilarModulo(moduloHijo);
        }
    }

    /*Metodo que permite transpilar la funcion main y generar el HTML completo*/
    transpilarMain(ast, tablaSimbolos, tablaComponentes, moduloYfera) {
        let codigo = '';

        const nodoMain = ast.find(n => n.tipo === 'FUNCION_MAIN');
        if (!nodoMain) return codigo;

        const esModuloRaiz = moduloYfera.recursos.componentes.length > 0 ||
            moduloYfera.recursos.estilos.length > 0;

        if (esModuloRaiz) {
            codigo += this.generarHTMLWrapper(moduloYfera, nodoMain, tablaSimbolos, tablaComponentes);
        } else {
            codigo += '/* === Funcion main ===*/\n';
            codigo += `async function main() {\n`;
            codigo += this.transpilarBloqueInstrucciones(nodoMain.cuerpo, tablaSimbolos, tablaComponentes, '  ');
            codigo += `}\n\n`;

            codigo += `document.addEventListener('DOMContentLoaded', () => {\n`;
            codigo += `  main().catch(error => console.error('Error en main:', error));\n`;
            codigo += `});\n\n`;
        }

        return codigo;
    }

    /*Metodo que genera el HTML completo con links a CSS y JS compilados*/
    generarHTMLWrapper(moduloYfera, nodoMain, tablaSimbolos, tablaComponentes) {

        let html = '';
        html += `<!DOCTYPE html>\n<html lang="es">\n<head>\n`;
        html += `  <meta charset="UTF-8">\n`;
        html += `  <meta name="viewport" content="width=device-width, initial-scale=1.0">\n`;
        html += `  <title>${moduloYfera.nombre.replace('.y', '')}</title>\n`;

        if (moduloYfera.recursosCompilados.compiledStyles) {
            html += `  <style>\n    ${moduloYfera.recursosCompilados.compiledStyles}\n  </style>\n`;
        }

        html += `</head>\n<body>\n  <div id="app"></div>\n\n`;
        html += `  <script type="module">\n`;

        if (moduloYfera.recursosCompilados.compiledComponentes) {
            html += `    ${moduloYfera.recursosCompilados.compiledComponentes}\n\n`;
        }

        html += this.transpilarVariablesGlobales(moduloYfera.ast, tablaSimbolos);

        html += this.transpilarFunciones(moduloYfera.ast, tablaSimbolos, moduloYfera.nombre);

        html += `    async function main() {\n`;
        html += this.transpilarBloqueInstrucciones(nodoMain.cuerpo, tablaSimbolos, tablaComponentes, '      ');
        html += `    }\n\n`;
        html += `    document.addEventListener('DOMContentLoaded', () => {\n`;
        html += `      main().catch(error => console.error('Error en main:', error));\n`;
        html += `    });\n`;

        html += `  </script>\n</body>\n</html>`;
        return html;
    }


    /*Metodo que permitr antraspilar la llamada a un componente*/
    transpilarLlamadaComponente(nodo, tablaComponentes, indent) {
        const nombreComponente = nodo.nombre;
        const args = (nodo.argumentos || []).map(a => this.transpilarExpresion(a)).join(', ');
        this.contadorComponentes++;
        const idUnico = `${nombreComponente}_${this.contadorComponentes}`;

        const simbolo = tablaComponentes.getVariable(nombreComponente);

        if (simbolo && simbolo.valor && simbolo.valor.cuerpo) {
            return `${indent}/* Renderizar componente: ${nombreComponente}*/\n` +
                `${indent}const ${idUnico}_html = ${nombreComponente}(${args});\n` +
                `${indent}document.getElementById('app').appendChild(${idUnico}_html);\n`;
        }

        return `${indent}/* Componente no encontrado: ${nombreComponente}*/\n`;
    }



    transpilarVariablesGlobales(ast, tablaSimbolos) {
        let codigo = '/* === Codigo Compilado ===*/\n';

        for (const nodo of ast) {
            if (!nodo) continue;

            switch (nodo.tipo) {
                case 'DECLARACION_VARIABLE':
                case 'INICIALIZACION_VARIABLE':
                    const simbolo = tablaSimbolos.getVariable(nodo.id);
                    if (simbolo) {
                        const valorInicial = this.transpilarExpresion(nodo.valor, tablaSimbolos) || this.valorDefault(nodo.tipado);
                        codigo += `let ${nodo.id} = ${valorInicial};\n`;
                    }
                    break;

                case 'ARREGLO_VACIO':
                    const tamano = this.transpilarExpresion(nodo.amplitud, tablaSimbolos);
                    const valorDefecto = this.valorDefault(nodo.tipado);
                    codigo += `let ${nodo.id} = new Array(${tamano}).fill(${valorDefecto});\n`;
                    break;

                case 'ARREGLO_INICIALIZADO':
                    const valores = nodo.valores.map(v => this.transpilarExpresion(v, tablaSimbolos)).join(', ');
                    codigo += `let ${nodo.id} = [${valores}];\n`;
                    break;

                case 'ARREGLO_QUERY':
                    codigo += `let ${nodo.id} = [];\n`;
                    break;

                case 'INSTRUCCION_IMPORT':
                    codigo += `// Import: ${nodo.ruta.valor}\n`;
                    break;
            }
        }

        codigo += '\n';
        return codigo;
    }

    /*Metodo que permite declarar las funciones asincronicas para comunicarse con la db*/
    transpilarFunciones(ast, tablaSimbolos) {
        let codigo = '/* === Funciones ===*/\n';

        for (const nodo of ast) {
            if (!nodo || nodo.tipo !== 'FUNCION') continue;

            const params = nodo.parametros.map(p => p.id).join(', ');
            const cuerpo = this.transpilarCuerpoFuncion(nodo.cuerpo, tablaSimbolos);

            codigo += `async function ${nodo.id}(${params}) {\n`;
            codigo += cuerpo;
            codigo += `}\n\n`;
        }

        return codigo;
    }

    /*Metodo que permite transpilar los loads y los excecutes*/
    transpilarCuerpoFuncion(cuerpo, tablaSimbolos, moduloYfera) {
        if (!cuerpo || !Array.isArray(cuerpo)) return '';

        let codigo = '';

        for (const instruccion of cuerpo) {
            if (!instruccion) continue;

            switch (instruccion.tipo) {
                case 'LOAD_ARCHIVO':
                    const ruta = this.transpilarExpresion(instruccion.uri, tablaSimbolos);

                    const nombreArchivo = ruta.replace(/"/g, '').replace('.y', '');
                    codigo += `  // Navegar a: ${ruta}\n`;
                    codigo += `  window.location.href = '${nombreArchivo}.html';\n`;
                    break;

                case 'LOAD_ID':
                    codigo += `  // Navegar a: ${instruccion.id}\n`;
                    codigo += `  window.location.href = ${instruccion.id}.replace('.y', '.html');\n`;
                    break;

                case 'DATABASE_QUERY':
                    const queryCode = this.transpilarQueryTemplate(instruccion.query, tablaSimbolos);
                    codigo += `  await executeQuery(${queryCode});\n`;
                    break;
            }
        }

        return codigo;
    }

    /*Metodo que permite transpilar el bloque de instrucciones*/
    transpilarBloqueInstrucciones(instrucciones, tablaSimbolos, tablaComponentes, indent = '') {
        if (!instrucciones || !Array.isArray(instrucciones)) return '';

        let codigo = '';

        for (const instruccion of instrucciones) {
            if (!instruccion) continue;

            switch (instruccion.tipo) {
                case 'LLAMADA_COMPONENTE':
                    codigo += this.transpilarLlamadaComponente(instruccion, tablaComponentes, indent);
                    break;

                case 'ASIGNACION':
                    const valor = this.transpilarExpresion(instruccion.valor, tablaSimbolos);
                    codigo += `${indent}${instruccion.id} = ${valor};\n`;
                    break;

                case 'ASIGNACION_ARREGLO':
                    const indice = this.transpilarExpresion(instruccion.indice, tablaSimbolos);
                    const valorArr = this.transpilarExpresion(instruccion.valor, tablaSimbolos);
                    codigo += `${indent}${instruccion.id}[${indice}] = ${valorArr};\n`;
                    break;

                case 'ESTRUCTURA_IF':
                    codigo += this.transpilarIf(instruccion, tablaSimbolos, tablaComponentes, indent);
                    break;

                case 'CICLO_WHILE':
                    codigo += this.transpilarWhile(instruccion, tablaSimbolos, tablaComponentes, indent);
                    break;

                case 'CICLO_DO_WHILE':
                    codigo += this.transpilarDoWhile(instruccion, tablaSimbolos, tablaComponentes, indent);
                    break;

                case 'CICLO_FOR':
                    codigo += this.transpilarFor(instruccion, tablaSimbolos, tablaComponentes, indent);
                    break;

                case 'ESTRUCTURA_SWITCH':
                    codigo += this.transpilarSwitch(instruccion, tablaSimbolos, tablaComponentes, indent);
                    break;

                case 'BREAK':
                    codigo += `${indent}break;\n`;
                    break;

                case 'CONTINUE':
                    codigo += `${indent}continue;\n`;
                    break;

                default:
                    codigo += `${indent}// Instrucción no implementada: ${instruccion.tipo}\n`;
                    break;
            }
        }

        return codigo;
    }

    /*Metodo que permite transpilar la estructura if*/
    transpilarIf(nodo, tablaSimbolos, tablaComponentes, indent) {
        const condicion = this.transpilarExpresion(nodo.condicion, tablaSimbolos);
        let codigo = `${indent}if (${condicion}) {\n`;
        codigo += this.transpilarBloqueInstrucciones(nodo.instrucciones_true, tablaSimbolos, tablaComponentes, indent + '  ');
        codigo += `${indent}}`;

        if (nodo.instrucciones_false) {
            codigo += ` else {\n`;
            const falseBranch = Array.isArray(nodo.instrucciones_false)
                ? nodo.instrucciones_false
                : [nodo.instrucciones_false];
            codigo += this.transpilarBloqueInstrucciones(falseBranch, tablaSimbolos, tablaComponentes, indent + '  ');
            codigo += `${indent}}`;
        }

        codigo += `\n`;
        return codigo;
    }

    /*Metodo que permite transpilar el ciclo while*/
    transpilarWhile(nodo, tablaSimbolos, tablaComponentes, indent) {
        const condicion = this.transpilarExpresion(nodo.condicion, tablaSimbolos);
        let codigo = `${indent}while (${condicion}) {\n`;
        codigo += this.transpilarBloqueInstrucciones(nodo.cuerpo, tablaSimbolos, tablaComponentes, indent + '  ');
        codigo += `${indent}}\n`;
        return codigo;
    }

    /*Metodo que permite transpilar el ciclo do wile*/
    transpilarDoWhile(nodo, tablaSimbolos, tablaComponentes, indent) {
        const condicion = this.transpilarExpresion(nodo.condicion, tablaSimbolos);
        let codigo = `${indent}do {\n`;
        codigo += this.transpilarBloqueInstrucciones(nodo.cuerpo, tablaSimbolos, tablaComponentes, indent + '  ');
        codigo += `${indent}} while (${condicion});\n`;
        return codigo;
    }

    /*Metodo que permite transpilar el ciclo for*/
    transpilarFor(nodo, tablaSimbolos, tablaComponentes, indent) {
        const variable = nodo.variable;
        const inicio = this.transpilarExpresion(nodo.inicio, tablaSimbolos);
        const condicion = this.transpilarExpresion(nodo.condicion, tablaSimbolos);

        let actualizacion;
        if (nodo.actualizacion.tipo === 'INCREMENTO_SIMPLE') {
            actualizacion = `${nodo.actualizacion.id}++`;
        } else {
            const valorAct = this.transpilarExpresion(nodo.actualizacion.valor, tablaSimbolos);
            actualizacion = `${nodo.actualizacion.id} = ${valorAct}`;
        }

        let codigo = `${indent}for (let ${variable} = ${inicio}; ${condicion}; ${actualizacion}) {\n`;
        codigo += this.transpilarBloqueInstrucciones(nodo.cuerpo, tablaSimbolos, tablaComponentes, indent + '  ');
        codigo += `${indent}}\n`;
        return codigo;
    }

    /*Metodo que permite transpilar un switch a codigo javascript*/
    transpilarSwitch(nodo, tablaSimbolos, tablaComponentes, indent) {
        const expresion = this.transpilarExpresion(nodo.expresion, tablaSimbolos);
        let codigo = `${indent}switch (${expresion}) {\n`;

        if (nodo.casos && Array.isArray(nodo.casos)) {
            for (const caso of nodo.casos) {
                if (caso.tipo === 'DEFAULT') {
                    codigo += `${indent}  default:\n`;
                } else {
                    const valorCaso = this.transpilarExpresion(caso.valor, tablaSimbolos);
                    codigo += `${indent}  case ${valorCaso}:\n`;
                }
                codigo += this.transpilarBloqueInstrucciones(caso.instrucciones, tablaSimbolos, tablaComponentes, indent + '    ');
                codigo += `${indent}    break;\n`;
            }
        }

        codigo += `${indent}}\n`;
        return codigo;
    }

    /*Metodo que permite transpilar las expresiones a javascript*/
    transpilarExpresion(nodo, tablaSimbolos = null) {
        if (!nodo) return 'null';

        switch (nodo.tipo) {
            case 'INT':
                return nodo.valor.toString();
            case 'FLOAT':
                return nodo.valor.toString();
            case 'VALOR_CADENA':
                return `"${nodo.valor.replace(/"/g, '\\"')}"`;
            case 'CHAR':
                return `"${nodo.valor.replace(/'/g, '')}"`;
            case 'BOOL':
                return nodo.valor ? 'true' : 'false';

            case 'ID':
                return nodo.valor;

            case 'ACCESO_ARREGLO':
                const indice = this.transpilarExpresion(nodo.indice, tablaSimbolos);
                return `${nodo.valor}[${indice}]`;

            case 'ARITMETICA':
                const izq = this.transpilarExpresion(nodo.izq, tablaSimbolos);
                const der = this.transpilarExpresion(nodo.der, tablaSimbolos);
                const operadores = {
                    'SUMA': '+', 'RESTA': '-', 'MULTIPLICACION': '*',
                    'DIVISION': '/', 'MODULO': '%'
                };
                return `(${izq} ${operadores[nodo.op] || nodo.op} ${der})`;

            case 'RELACIONAL':
                const izqRel = this.transpilarExpresion(nodo.izq, tablaSimbolos);
                const derRel = this.transpilarExpresion(nodo.der, tablaSimbolos);
                const opsRel = {
                    'IGUALACION': '===', 'DIFERENCIA': '!==',
                    'MAYOR': '>', 'MENOR': '<',
                    'MAYOR_IGUAL': '>=', 'MENOR_IGUAL': '<='
                };
                return `(${izqRel} ${opsRel[nodo.op] || nodo.op} ${derRel})`;

            case 'LOGICA':
                const izqLog = this.transpilarExpresion(nodo.izq, tablaSimbolos);
                const derLog = this.transpilarExpresion(nodo.der, tablaSimbolos);
                const opLog = nodo.op === 'OR' ? '||' : '&&';
                return `(${izqLog} ${opLog} ${derLog})`;

            case 'UNARIA':
                const derUna = this.transpilarExpresion(nodo.der, tablaSimbolos);
                if (nodo.op === 'NEGATIVO') return `(-${derUna})`;
                if (nodo.op === 'NOT') return `(!${derUna})`;
                return derUna;

            default:
                return `/* ${nodo.tipo} */`;
        }
    }

    /*Metodo que permite transpilar la query de la base de datos sql*/
    transpilarQueryTemplate(nodoQuery, tablaSimbolos) {
        if (!nodoQuery || !nodoQuery.fragmentos) return '""';

        let comandoCompleto = '';

        for (const fragmento of nodoQuery.fragmentos) {
            if (fragmento.tipo === 'TEXTO_QUERY') {
                comandoCompleto += fragmento.valor;
            } else if (fragmento.tipo === 'VAR_INTERPOLADA') {
                comandoCompleto += fragmento.id;
            }
        }

        if (!comandoCompleto.trim().endsWith(';')) {
            comandoCompleto += ';';
        }

        const interprete = new InterpreteSqlCodigo(this.manejadorDb);
        const resultado = interprete.traducirSqlComando(comandoCompleto);

        if (resultado.exito && resultado.sql.length > 0) {
            return '`' + resultado.sql.join('; ') + '`';
        } else {
            return '""';
        }
    }

    /*Meotod que permite darle el vlaor default  a los tipos de datos primitivos*/
    valorDefault(tipo) {
        switch (tipo) {
            case 'ENTERA': return '0';
            case 'FLOAT': return '0.0';
            case 'BOOLEANA': return 'false';
            case 'CARACTER': return '""';
            case 'CADENA': return '""';
            default: return 'null';
        }
    }
}