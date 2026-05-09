import { TablaSimbolos } from "../semanticsyfera/TablaSimbolos";

import { SimboloComponente } from "../semanticsyfera/SimboloComponente";

/*Clase delegada para transpilar el codigo .comp a codigo javaScript */
export class TranspiladorComponentes {

    constructor(compilador, manejadorDb) {
        this.compilador = compilador;
        this.manejadorDb = manejadorDb;
    }

    /* Metodo que transpila un bloque de componente individual */
    async transpilarComponente(nodo, recursoComponente, moduloYFera) {
        const nombreComponente = nodo.id;
        const parametros = this.extraerParametros(nodo.parametros);

        // Generar lista de parámetros para la función JS
        const paramsJS = parametros.map(p => p.nombre).join(', ');

        // Generar el cuerpo del componente usando el AST
        const cuerpoJS = await this.transpilarCuerpo(nodo.cuerpo, parametros, moduloYFera);

        return `
/**
 * Componente: ${nombreComponente}
 * Archivo: ${recursoComponente.nombreArchivo}
 */
function ${nombreComponente}(${paramsJS}) {
    const _container = document.createElement('div');
    _container.className = '${nombreComponente.toLowerCase()}-container';
    ${cuerpoJS}
    return _container;
}
`;
    }

    /* Metodo que permite transpilar el cuerpo del componente */
    async transpilarCuerpo(nodo, parametros, moduloYFera) {
        if (!nodo) return '';

        let codigo = '';

        if (Array.isArray(nodo)) {
            for (const elemento of nodo) {
                codigo += await this.transpilarNodo(elemento, parametros, moduloYFera);
            }
        } else if (typeof nodo === 'object') {
            codigo += await this.transpilarNodo(nodo, parametros, moduloYFera);
        }

        return codigo;
    }

    /*Metodo que permite transpilar un nodo segun el tipo de componente */
    async transpilarNodo(nodo, parametros, moduloYFera) {
        if (!nodo) return '';

        switch (nodo.tipo) {
            case 'SECCION':
                return await this.transpilarSeccion(nodo, parametros, moduloYFera);

            case 'TABLA':
                return await this.transpilarTabla(nodo, parametros, moduloYFera);

            case 'FILA':
                return await this.transpilarFila(nodo, parametros, moduloYFera);

            case 'CELDA':
                return await this.transpilarCelda(nodo, parametros, moduloYFera);

            case 'COMPONENTE_TEXTO':
                return await this.transpilarTexto(nodo, parametros, moduloYFera);

            case 'COMPONENTE_IMG':
                return await this.transpilarImagen(nodo, parametros, moduloYFera);

            case 'FORMULARIO':
                return await this.transpilarFormulario(nodo, parametros, moduloYFera);

            case 'INPUT_TEXT':
            case 'INPUT_NUMBER':
            case 'INPUT_BOOL':
                return await this.transpilarInput(nodo, parametros, moduloYFera);

            case 'FOR_EACH':
                return await this.transpilarForEach(nodo, parametros, moduloYFera);

            case 'FOR_COMPLEJO':
                return await this.transpilarForComplejo(nodo, parametros, moduloYFera);

            case 'ESTRUCTURA_IF':
                return await this.transpilarIf(nodo, parametros, moduloYFera);

            case 'ELSE_IF':
            case 'ELSE_FINAL':
                return await this.transpilarElseIf(nodo, parametros, moduloYFera);

            case 'ESTRUCTURA_SWITCH':
                return await this.transpilarSwitch(nodo, parametros, moduloYFera);

            case 'COMPONENTE_PERSONALIZADO':
                return await this.transpilarInvocacionComponente(nodo, parametros, moduloYFera);

            case 'SUBMIT':
                return await this.transpilarSubmit(nodo, parametros, moduloYFera);

            default:
                return '';
        }
    }

    /* Metodo que permite transpilar una seccion */
    async transpilarSeccion(nodo, parametros, moduloYFera) {
        const estilos = nodo.estilos && Array.isArray(nodo.estilos) ? nodo.estilos.join(' ') : '';
        const contenido = await this.transpilarCuerpo(nodo.contenido, parametros, moduloYFera);

        if (estilos) {
            return `
    const _section = document.createElement('div');
    _section.className = '${estilos}';
    _section.innerHTML = \`
        ${contenido}
    \`;
    _container.appendChild(_section);
`;
        } else {
            return `
    _container.innerHTML += \`
        ${contenido}
    \`;
`;
        }
    }

    /*Metodo que permite transpilar una tabla */
    async transpilarTabla(nodo, parametros, moduloYFera) {
        const estilos = nodo.estilos && Array.isArray(nodo.estilos) ? nodo.estilos.join(' ') : '';
        const filas = await this.transpilarCuerpo(nodo.filas, parametros, moduloYFera);

        if (estilos) {
            return `
    const _table = document.createElement('table');
    _table.className = '${estilos}';
    _table.innerHTML = \`
        ${filas}
    \`;
    _container.appendChild(_table);
`;
        } else {
            return `
    const _table = document.createElement('table');
    _table.innerHTML = \`
        ${filas}
    \`;
    _container.appendChild(_table);
`;
        }
    }

    /*Metodo que permite transpila una fila */
    async transpilarFila(nodo, parametros, moduloYFera) {
        const estilos = nodo.estilos && Array.isArray(nodo.estilos) ? nodo.estilos.join(' ') : '';
        const celdas = await this.transpilarCuerpo(nodo.celdas, parametros, moduloYFera);

        if (estilos) {
            return `<tr class="${estilos}">${celdas}</tr>`;
        }
        return `<tr>${celdas}</tr>`;
    }

    /*Metodo que permite transpilar una celda */
    async transpilarCelda(nodo, parametros, moduloYFera) {
        const estilos = nodo.estilos && Array.isArray(nodo.estilos) ? nodo.estilos.join(' ') : '';
        const contenido = await this.transpilarCuerpo(nodo.contenido, parametros, moduloYFera);

        if (estilos) {
            return `<td class="${estilos}">${contenido}</td>`;
        }
        return `<td>${contenido}</table>`;
    }

    /*Metodo que permite transpilar el componente de TEXTO */
    async transpilarTexto(nodo, parametros, moduloYFera) {
        const estilos = nodo.estilos && Array.isArray(nodo.estilos) ? nodo.estilos.join(' ') : '';
        const contenido = await this.transpilarExpresion(
            nodo.contenido,
            parametros,
            moduloYFera.tablaSimbolosComponentes
        );

        if (estilos) {
            return `<span class="${estilos}">${contenido}</span>`;
        }
        return contenido;
    }

    /*Metodo que permite transpilar el componente de IMAGEN */
    async transpilarImagen(nodo, parametros, moduloYFera) {
        const estilos = nodo.estilos && Array.isArray(nodo.estilos) ? nodo.estilos.join(' ') : '';
        let urlsJS = [];

        if (nodo.urls && Array.isArray(nodo.urls)) {
            for (const url of nodo.urls) {
                urlsJS.push(await this.transpilarExpresion(url, parametros, moduloYFera.tablaSimbolosComponentes));
            }
        }

        const primeraUrlExpr = urlsJS.length > 0 ? urlsJS[0] : "''";

        const arrayUrlsCliente = `[${urlsJS.join(', ')}]`;

        const idUnico = `img_${nodo.linea}_${nodo.columna}`;

        return `
    (() => {
        const _urls = ${arrayUrlsCliente};
        const _img = document.createElement('img');
        _img.src = ${primeraUrlExpr};
        _img.className = '${estilos}';
        
        if (_urls.length > 1) {
            _img.style.cursor = 'pointer';
            _img.title = 'Click para ver siguiente imagen';
            let _idx = 0;
            _img.addEventListener('click', () => {
                _idx = (_idx + 1) % _urls.length;
                _img.src = _urls[_idx];
            });
        }
        _container.appendChild(_img);
    })();
    `;
    }

    /*Metodo que permite transpilar a un FORMULARIO */
    async transpilarFormulario(nodo, parametros, moduloYFera) {
        const estilos = nodo.estilos && Array.isArray(nodo.estilos) ? nodo.estilos.join(' ') : '';
        const contenido = await this.transpilarCuerpo(nodo.contenido, parametros, moduloYFera);
        let submitJS = '';

        if (nodo.submit) {
            submitJS = await this.transpilarSubmit(nodo.submit, parametros, moduloYFera);
        }

        if (estilos) {
            return `
    const _form = document.createElement('form');
    _form.className = '${estilos}';
    _form.innerHTML = \`
        ${contenido}
    \`;
    ${submitJS}
    _container.appendChild(_form);
`;
        } else {
            return `
    const _form = document.createElement('form');
    _form.innerHTML = \`
        ${contenido}
    \`;
    ${submitJS}
    _container.appendChild(_form);
`;
        }
    }

    /* Metodo que permite transpilar a propiedades INPUT */
    async transpilarInput(nodo, parametros, moduloYFera, tablaSimbolos) {
        const estilos = nodo.estilos && Array.isArray(nodo.estilos) ? nodo.estilos.join(' ') : '';
        let id = '', label = '', value = '';

        if (nodo.propiedades) {
            for (const prop of nodo.propiedades) {
                const valor = await this.transpilarExpresion(
                    prop.valor,
                    parametros,
                    tablaSimbolos
                );
                if (prop.clave === 'id') id = valor;
                if (prop.clave === 'label') label = valor;
                if (prop.clave === 'value') value = valor;
            }
        }

        const tipoInput = nodo.tipo === 'INPUT_TEXT' ? 'text' : (nodo.tipo === 'INPUT_NUMBER' ? 'number' : 'checkbox');

        let valueAttr = '';
        if (nodo.tipo === 'INPUT_BOOL') {
            valueAttr = `\${${value} ? 'checked' : ''}`;
        } else {
            if (typeof value === 'string' && !value.match(/^[a-zA-Z_][a-zA-Z0-9_]*$/)) {
                valueAttr = `value="${value}"`;
            } else if (value) {
                valueAttr = `value="\${${value}}"`;
            }
        }

        if (estilos) {
            return `
    <div class="input-group">
        <label for="${id}">${label}</label>
        <input type="${tipoInput}" id="${id}" name="${id}" class="${estilos}" ${valueAttr} />
    </div>
`;
        } else {
            return `
    <div class="input-group">
        <label for="${id}">${label}</label>
        <input type="${tipoInput}" id="${id}" name="${id}" ${valueAttr} />
    </div>
`;
        }
    }

    /* Metodo que permite transpilar a los botones SUBMIT */
    async transpilarSubmit(nodo, parametros, moduloYFera, tablaSimbolos) {
        const estilos = nodo.estilos && Array.isArray(nodo.estilos) ? nodo.estilos.join(' ') : '';
        let label = 'Submit';
        let funcion = '';

        if (nodo.propiedades) {
            for (const prop of nodo.propiedades) {
                const valor = await this.transpilarExpresion(
                    prop.valor,
                    parametros,
                    tablaSimbolos
                );
                if (prop.clave === 'label') label = valor;
                if (prop.clave === 'function') funcion = valor;
            }
        }

        const estilosAttr = estilos ? `_submit.className = '${estilos}';` : '';

        if (funcion) {
            return `
    const _submit = document.createElement('button');
    _submit.type = 'submit';
    _submit.textContent = ${label};
    ${estilosAttr}
    _form.appendChild(_submit);
    
    _form.addEventListener('submit', async (e) => {
        e.preventDefault();
        const formData = new FormData(_form);
        const data = {};
        for (let [key, val] of formData.entries()) {
            data[key] = val;
        }
        await ${funcion};
    });
`;
        } else {
            return `
    const _submit = document.createElement('button');
    _submit.type = 'submit';
    _submit.textContent = ${label};
    ${estilosAttr}
    _form.appendChild(_submit);
`;
        }
    }

    /* Metodo que permite transpilar el ciclo FOR_EACH */
    async transpilarForEach(nodo, parametros, moduloYFera) {
        const arreglo = nodo.arreglo;
        const iterador = nodo.iterador;
        const cuerpo = await this.transpilarCuerpo(nodo.cuerpo, parametros, moduloYFera);
        let emptyJS = '';

        if (nodo.empty && nodo.empty.cuerpo) {
            emptyJS = await this.transpilarCuerpo(nodo.empty.cuerpo, parametros, moduloYFera);
        }

        return `
    if (${arreglo} && ${arreglo}.length > 0) {
        for (let ${iterador} of ${arreglo}) {
            ${cuerpo}
        }
    } else {
        ${emptyJS}
    }
`;
    }

    /* Metodo que permite transpilar el ciclo FOR_COMPLEJO */
    async transpilarForComplejo(nodo, parametros, moduloYFera) {
        let iteradoresJS = '';

        if (nodo.iteradores && nodo.iteradores.length > 0) {
            const primerIterador = nodo.iteradores[0];
            iteradoresJS = `for (let ${primerIterador.iterador} of ${primerIterador.arreglo}) {`;

            for (let i = 1; i < nodo.iteradores.length; i++) {
                const iter = nodo.iteradores[i];
                iteradoresJS += `\n    for (let ${iter.iterador} of ${iter.arreglo}) {`;
            }

            const cuerpo = await this.transpilarCuerpo(nodo.cuerpo, parametros, moduloYFera);
            iteradoresJS += `\n    ${cuerpo}`;

            for (let i = 0; i < nodo.iteradores.length; i++) {
                iteradoresJS += '\n    }';
            }
        }

        return iteradoresJS;
    }

    /* Metodo que permite transpilar a la ESTRUCTURA_IF */
    async transpilarIf(nodo, parametros, moduloYFera) {
        const condicion = await this.transpilarExpresion(
            nodo.condicion,
            parametros,
            moduloYFera.tablaSimbolosComponentes
        );
        const cuerpo = await this.transpilarCuerpo(nodo.cuerpo, parametros, moduloYFera);
        let continuacionJS = '';

        if (nodo.continuacion) {
            continuacionJS = await this.transpilarNodo(nodo.continuacion, parametros, moduloYFera);
        }

        return `
    if (${condicion}) {
        ${cuerpo}
    } ${continuacionJS}
`;
    }

    /* Metodo que permite transpilar a los ELSE_IF y ELSE_FINAL */
    async transpilarElseIf(nodo, parametros, moduloYFera) {
        if (nodo.tipo === 'ELSE_IF') {
            const condicion = await this.transpilarExpresion(
                nodo.condicion,
                parametros,
                moduloYFera.tablaSimbolosComponentes
            );
            const cuerpo = await this.transpilarCuerpo(nodo.cuerpo, parametros, moduloYFera);
            let continuacionJS = '';

            if (nodo.continuacion) {
                continuacionJS = await this.transpilarNodo(nodo.continuacion, parametros, moduloYFera);
            }

            return `else if (${condicion}) {
        ${cuerpo}
    } ${continuacionJS}`;
        } else if (nodo.tipo === 'ELSE_FINAL') {
            const cuerpo = await this.transpilarCuerpo(nodo.cuerpo, parametros, moduloYFera);
            return `else {
        ${cuerpo}
    }`;
        }
        return '';
    }

    /* Metodos que permiten transpilar a la ESTRUCTURA_SWITCH */
    async transpilarSwitch(nodo, parametros, moduloYFera) {
        const evalua = await this.transpilarExpresion(
            nodo.evalua,
            parametros,
            moduloYFera.tablaSimbolosComponentes
        );
        let casosJS = '';

        if (nodo.casos && Array.isArray(nodo.casos)) {
            for (const caso of nodo.casos) {
                if (caso.tipo === 'CASO_SWITCH') {
                    const valor = await this.transpilarExpresion(caso.valor_comparacion, parametros, moduloYFera.tablaSimbolosComponentes);
                    const cuerpo = await this.transpilarCuerpo(caso.cuerpo, parametros, moduloYFera);
                    casosJS += `
        case ${valor}:
            ${cuerpo}
            break;`;
                } else if (caso.tipo === 'DEFAULT_SWITCH') {
                    const cuerpo = await this.transpilarCuerpo(caso.cuerpo, parametros, moduloYFera);
                    casosJS += `
        default:
            ${cuerpo}
            break;`;
                }
            }
        }

        return `
    switch (${evalua}) {${casosJS}
    }
`;
    }

    /* Metodo que permite transpilar a la invocacion de componente */
    async transpilarInvocacionComponente(nodo, parametros, moduloYFera) {
        const nombreComponente = nodo.id;
        let argumentosJS = '';

        if (nodo.argumentos && Array.isArray(nodo.argumentos)) {
            const args = [];
            for (const arg of nodo.argumentos) {
                args.push(await this.transpilarExpresion(
                    arg,
                    parametros,
                    moduloYFera.tablaSimbolosComponentes
                ));
            }
            argumentosJS = args.join(', ');
        }

        return `
    const _${nombreComponente.toLowerCase()} = ${nombreComponente}(${argumentosJS});
    _container.appendChild(_${nombreComponente.toLowerCase()});
`;
    }

    /* Metodo que permite transpilar una expresion a JavaScript */
    async transpilarExpresion(expr, parametros, tablaSimbolos) {
        if (!expr) return 'null';

        switch (expr.tipo) {
            case 'VALOR':
                if (typeof expr.valor === 'number') {
                    return expr.valor;
                }
                return `'${expr.valor}'`;

            case 'VALOR_TRUE':
                return 'true';

            case 'VALOR_FALSE':
                return 'false';

            case 'CADENA_INTERPOLADA':
                return await this.transpilarCadenaInterpolada(expr, parametros, tablaSimbolos);

            case 'VARIABLE':
                return expr.nombre;

            case 'ACCESO_ARREGLO':
                const indice = await this.transpilarExpresion(expr.indice, parametros, tablaSimbolos);
                return `${expr.nombre}[${indice}]`;

            case 'OPERACION':
                const izq = await this.transpilarExpresion(expr.izq, parametros, tablaSimbolos);
                const der = await this.transpilarExpresion(expr.der, parametros, tablaSimbolos);
                const operador = this.mapearOperador(expr.operador);
                return `(${izq} ${operador} ${der})`;

            case 'OPERACION_UNARIA':
                const valor = await this.transpilarExpresion(expr.valor, parametros, tablaSimbolos);
                if (expr.operador === 'NOT') return `(!${valor})`;
                if (expr.operador === 'MENOS_UNARIO') return `(-${valor})`;
                return valor;

            case 'LLAMADA_FUNCION_VAR':
                const args = [];
                if (expr.argumentos) {
                    for (const arg of expr.argumentos) {
                        args.push(await this.transpilarExpresion(arg, parametros, tablaSimbolos));
                    }
                }
                return `${expr.nombre}(${args.join(', ')})`;

            case 'ARROBA_VAR':
                return `document.getElementById('${expr.nombre}').value`;

            default:
                return 'null';
        }
    }

    /* Metodo que permite transpilar a una cadena interpolada con backticks */
    async transpilarCadenaInterpolada(expr, parametros, tablaSimbolos) {
        if (!expr.fragmentos || expr.fragmentos.length === 0) return "''";

        let resultado = '`';
        for (const frag of expr.fragmentos) {
            if (frag.tipo === 'TEXTO_PLANO') {
                resultado += frag.valor;
            } else if (frag.tipo === 'VARIABLE') {
                resultado += `\${${frag.nombre}}`;
            } else if (frag.tipo === 'ACCESO_ARREGLO') {
                const indice = await this.transpilarExpresion(frag.indice, parametros, tablaSimbolos);
                resultado += `\${${frag.nombre}[${indice}]}`;
            } else if (frag.tipo === 'EXPRESION_INTERPOLADA' && frag.expresion) {
                const expresionJS = await this.transpilarExpresion(frag.expresion, parametros, tablaSimbolos);
                resultado += `\${${expresionJS}}`;
            }
        }
        resultado += '`';
        return resultado;
    }

    /* Metodo que permite mapear los operadores del parser a JS */
    mapearOperador(operador) {
        const mapa = {
            'SUMA': '+',
            'RESTA': '-',
            'MULTIPLICACION': '*',
            'DIVISION': '/',
            'MODULO': '%',
            'MAYOR': '>',
            'MENOR': '<',
            'MAYOR_IGUAL': '>=',
            'MENOR_IGUAL': '<=',
            'IGUALACION': '===',
            'DIFERENCIA': '!==',
            'AND': '&&',
            'OR': '||'
        };
        return mapa[operador] || operador;
    }

    /* Metodo que permite extraer los parametros del AST */
    extraerParametros(parametrosAST) {
        if (!parametrosAST || !Array.isArray(parametrosAST)) {
            return [];
        }

        return parametrosAST.map(param => {
            if (param.tipo === 'PARAMETRO_DEF') {
                return {
                    nombre: param.id,
                    tipo: param.tipado,
                    esArreglo: false
                };
            } else if (param.tipo === 'PARAMETRO_DEF_ARREGLO') {
                return {
                    nombre: param.id,
                    tipo: param.tipado,
                    esArreglo: true
                };
            }
            return null;
        }).filter(p => p !== null);
    }
}