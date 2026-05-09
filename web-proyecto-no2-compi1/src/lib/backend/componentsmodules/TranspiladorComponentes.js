import { TablaSimbolos } from "../semanticsyfera/TablaSimbolos";

import { SimboloComponente } from "../semanticsyfera/SimboloComponente";

/*Clase delegada para transpilar el codigo .comp a codigo javaScript */
export class TranspiladorComponentes {

    constructor(compilador, manejadorDb) {
        this.compilador = compilador;
        this.manejadorDb = manejadorDb;
        this._varCounter = 0;
    }

    /* Genera un identificador único */
    _uid(prefix = 'v') {
        return `${prefix}_${this._varCounter++}`;
    }

    /* Metodo que transpila un bloque de componente individual */
    async transpilarComponente(nodo, recursoComponente, moduloYFera) {
        this._varCounter = 0;

        const nombreComponente = nodo.id;
        const parametros = this.extraerParametros(nodo.parametros);

        const tablaLocal = new TablaSimbolos(moduloYFera.tablaSimbolosComponentes);
        for (const param of parametros) {
            tablaLocal.insertar(param.nombre, {
                id: param.nombre,
                tipoDato: param.tipo,
                esArreglo: param.esArreglo
            });
        }

        const paramsJS = parametros.map(p => p.nombre).join(', ');
        const cuerpoJS = await this.transpilarCuerpo(nodo.cuerpo, parametros, moduloYFera, tablaLocal);

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

    /* Transpila el cuerpo a codigo JS que construye DOM */
    async transpilarCuerpo(nodo, parametros, moduloYFera, tablaSimbolos) {
        if (!nodo) return '';

        let codigo = '';
        if (Array.isArray(nodo)) {
            for (const elemento of nodo) {
                codigo += await this.transpilarNodo(elemento, parametros, moduloYFera, tablaSimbolos);
            }
        } else if (typeof nodo === 'object') {
            codigo += await this.transpilarNodo(nodo, parametros, moduloYFera, tablaSimbolos);
        }
        return codigo;
    }

    /* Transpila cada nodo del AST */
    async transpilarNodo(nodo, parametros, moduloYFera, tablaSimbolos) {
        if (!nodo) return '';

        switch (nodo.tipo) {
            case 'SECCION':
                return await this.transpilarSeccion(nodo, parametros, moduloYFera, tablaSimbolos);
            case 'TABLA':
                return await this.transpilarTabla(nodo, parametros, moduloYFera, tablaSimbolos);
            case 'FILA':
                return await this.transpilarFila(nodo, parametros, moduloYFera, tablaSimbolos);
            case 'CELDA':
                return await this.transpilarCelda(nodo, parametros, moduloYFera, tablaSimbolos);
            case 'COMPONENTE_TEXTO':
                return await this.transpilarTexto(nodo, parametros, moduloYFera, tablaSimbolos);
            case 'COMPONENTE_IMG':
                return await this.transpilarImagen(nodo, parametros, moduloYFera, tablaSimbolos);
            case 'FORMULARIO':
                return await this.transpilarFormulario(nodo, parametros, moduloYFera, tablaSimbolos);
            case 'INPUT_TEXT':
            case 'INPUT_NUMBER':
            case 'INPUT_BOOL':
                return await this.transpilarInput(nodo, parametros, moduloYFera, tablaSimbolos);
            case 'FOR_EACH':
                return await this.transpilarForEach(nodo, parametros, moduloYFera, tablaSimbolos);
            case 'FOR_COMPLEJO':
                return await this.transpilarForComplejo(nodo, parametros, moduloYFera, tablaSimbolos);
            case 'ESTRUCTURA_IF':
                return await this.transpilarIf(nodo, parametros, moduloYFera, tablaSimbolos);
            case 'ELSE_IF':
            case 'ELSE_FINAL':
                return await this.transpilarElseIf(nodo, parametros, moduloYFera, tablaSimbolos);
            case 'ESTRUCTURA_SWITCH':
                return await this.transpilarSwitch(nodo, parametros, moduloYFera, tablaSimbolos);
            case 'COMPONENTE_PERSONALIZADO':
                return await this.transpilarInvocacionComponente(nodo, parametros, moduloYFera, tablaSimbolos);
            case 'SUBMIT':
                return await this.transpilarSubmit(nodo, parametros, moduloYFera, tablaSimbolos);
            default:
                return '';
        }
    }

    /* Seccion - genera div contenedor */
    async transpilarSeccion(nodo, parametros, moduloYFera, tablaSimbolos) {
        const estilos = nodo.estilos && Array.isArray(nodo.estilos) ? nodo.estilos.join(' ') : '';
        const contenido = await this.transpilarCuerpo(nodo.contenido, parametros, moduloYFera, tablaSimbolos);
        const sectionVar = this._uid('section');

        if (estilos) {
            return `
    const ${sectionVar} = document.createElement('div');
    ${sectionVar}.className = '${estilos}';
    ${contenido}
    _container.appendChild(${sectionVar});
`;
        }
        return contenido;
    }

    /* Tabla */
    async transpilarTabla(nodo, parametros, moduloYFera, tablaSimbolos) {
        const estilos = nodo.estilos && Array.isArray(nodo.estilos) ? nodo.estilos.join(' ') : '';
        const filas = await this.transpilarCuerpo(nodo.filas, parametros, moduloYFera, tablaSimbolos);
        const tableVar = this._uid('table');

        if (estilos) {
            return `
    const ${tableVar} = document.createElement('table');
    ${tableVar}.className = '${estilos}';
    ${filas}
    _container.appendChild(${tableVar});
`;
        } else {
            return `
    const ${tableVar} = document.createElement('table');
    ${filas}
    _container.appendChild(${tableVar});
`;
        }
    }

    /* Fila */
    async transpilarFila(nodo, parametros, moduloYFera, tablaSimbolos) {
        const estilos = nodo.estilos && Array.isArray(nodo.estilos) ? nodo.estilos.join(' ') : '';
        const celdas = await this.transpilarCuerpo(nodo.celdas, parametros, moduloYFera, tablaSimbolos);
        const rowVar = this._uid('row');

        if (estilos) {
            return `
    const ${rowVar} = document.createElement('tr');
    ${rowVar}.className = '${estilos}';
    ${celdas}
    _table.appendChild(${rowVar});
`;
        } else {
            return `
    const ${rowVar} = document.createElement('tr');
    ${celdas}
    _table.appendChild(${rowVar});
`;
        }
    }

    /* Celda */
    async transpilarCelda(nodo, parametros, moduloYFera, tablaSimbolos) {
        const estilos = nodo.estilos && Array.isArray(nodo.estilos) ? nodo.estilos.join(' ') : '';
        const contenido = await this.transpilarCuerpo(nodo.contenido, parametros, moduloYFera, tablaSimbolos);
        const cellVar = this._uid('cell');

        if (estilos) {
            return `
    const ${cellVar} = document.createElement('td');
    ${cellVar}.className = '${estilos}';
    ${contenido}
    _row.appendChild(${cellVar});
`;
        } else {
            return `
    const ${cellVar} = document.createElement('td');
    ${contenido}
    _row.appendChild(${cellVar});
`;
        }
    }

    /* Texto */
    async transpilarTexto(nodo, parametros, moduloYFera, tablaSimbolos) {
        const estilos = nodo.estilos && Array.isArray(nodo.estilos) ? nodo.estilos.join(' ') : '';
        const contenido = await this.transpilarExpresion(nodo.contenido, parametros, tablaSimbolos);
        const textVar = this._uid('text');

        if (estilos) {
            return `
    const ${textVar} = document.createElement('span');
    ${textVar}.className = '${estilos}';
    ${textVar}.textContent = ${contenido};
    _container.appendChild(${textVar});
`;
        } else {
            return `
    const ${textVar} = document.createTextNode(${contenido});
    _container.appendChild(${textVar});
`;
        }
    }

    /* Metodo que permite transpilar una imagen*/
    async transpilarImagen(nodo, parametros, moduloYFera, tablaSimbolos) {
        const estilos = nodo.estilos && Array.isArray(nodo.estilos) ? nodo.estilos.join(' ') : '';
        let urlsJS = [];

        if (nodo.urls && Array.isArray(nodo.urls)) {
            for (const url of nodo.urls) {
                urlsJS.push(await this.transpilarExpresion(url, parametros, tablaSimbolos));
            }
        }

        const imgVar = this._uid('img');

        // Si solo hay una imagen, renderizado simple
        if (urlsJS.length === 1) {
            if (estilos) {
                return `
    const ${imgVar} = document.createElement('img');
    ${imgVar}.className = '${estilos}';
    ${imgVar}.src = ${urlsJS[0]};
    _container.appendChild(${imgVar});
`;
            } else {
                return `
    const ${imgVar} = document.createElement('img');
    ${imgVar}.src = ${urlsJS[0]};
    _container.appendChild(${imgVar});
`;
            }
        }

        const carruselVar = this._uid('carrusel');
        const imgDisplayVar = this._uid('imgDisplay');
        const prevBtnVar = this._uid('prevBtn');
        const nextBtnVar = this._uid('nextBtn');
        const dotsContainerVar = this._uid('dotsContainer');

        const arrayUrlsJS = `[${urlsJS.join(', ')}]`;

        return `
    const ${carruselVar} = document.createElement('div');
    ${carruselVar}.className = 'carrusel-container';
    ${estilos ? `${carruselVar}.classList.add('${estilos}');` : ''}
    
    const ${imgDisplayVar} = document.createElement('img');
    ${imgDisplayVar}.src = ${urlsJS[0]};
    ${imgDisplayVar}.style.width = '100%';
    ${imgDisplayVar}.style.borderRadius = '8px';
    
    const ${prevBtnVar} = document.createElement('button');
    ${prevBtnVar}.textContent = '❮';
    ${prevBtnVar}.style.position = 'absolute';
    ${prevBtnVar}.style.left = '10px';
    ${prevBtnVar}.style.top = '50%';
    ${prevBtnVar}.style.transform = 'translateY(-50%)';
    ${prevBtnVar}.style.backgroundColor = 'rgba(0,0,0,0.5)';
    ${prevBtnVar}.style.color = 'white';
    ${prevBtnVar}.style.border = 'none';
    ${prevBtnVar}.style.padding = '10px';
    ${prevBtnVar}.style.cursor = 'pointer';
    ${prevBtnVar}.style.borderRadius = '50%';
    
    const ${nextBtnVar} = document.createElement('button');
    ${nextBtnVar}.textContent = '❯';
    ${nextBtnVar}.style.position = 'absolute';
    ${nextBtnVar}.style.right = '10px';
    ${nextBtnVar}.style.top = '50%';
    ${nextBtnVar}.style.transform = 'translateY(-50%)';
    ${nextBtnVar}.style.backgroundColor = 'rgba(0,0,0,0.5)';
    ${nextBtnVar}.style.color = 'white';
    ${nextBtnVar}.style.border = 'none';
    ${nextBtnVar}.style.padding = '10px';
    ${nextBtnVar}.style.cursor = 'pointer';
    ${nextBtnVar}.style.borderRadius = '50%';
    
    const ${dotsContainerVar} = document.createElement('div');
    ${dotsContainerVar}.style.textAlign = 'center';
    ${dotsContainerVar}.style.marginTop = '10px';
    
    ${carruselVar}.style.position = 'relative';
    ${carruselVar}.style.display = 'inline-block';
    
    let currentIndex_${this._varCounter} = 0;
    const urls_${this._varCounter} = ${arrayUrlsJS};
    
    function updateImage_${this._varCounter}() {
        ${imgDisplayVar}.src = urls_${this._varCounter}[currentIndex_${this._varCounter}];
        const dots = ${dotsContainerVar}.querySelectorAll('.dot');
        dots.forEach((dot, i) => {
            if (i === currentIndex_${this._varCounter}) {
                dot.classList.add('active');
                dot.style.backgroundColor = '#333';
            } else {
                dot.classList.remove('active');
                dot.style.backgroundColor = '#bbb';
            }
        });
    }
    
    function createDots_${this._varCounter}() {
        for (let i = 0; i < urls_${this._varCounter}.length; i++) {
            const dot = document.createElement('span');
            dot.className = 'dot';
            dot.style.height = '15px';
            dot.style.width = '15px';
            dot.style.margin = '0 5px';
            dot.style.backgroundColor = i === 0 ? '#333' : '#bbb';
            dot.style.borderRadius = '50%';
            dot.style.display = 'inline-block';
            dot.style.cursor = 'pointer';
            dot.addEventListener('click', () => {
                currentIndex_${this._varCounter} = i;
                updateImage_${this._varCounter}();
            });
            ${dotsContainerVar}.appendChild(dot);
        }
    }
    
    ${prevBtnVar}.addEventListener('click', () => {
        currentIndex_${this._varCounter} = (currentIndex_${this._varCounter} - 1 + urls_${this._varCounter}.length) % urls_${this._varCounter}.length;
        updateImage_${this._varCounter}();
    });
    
    ${nextBtnVar}.addEventListener('click', () => {
        currentIndex_${this._varCounter} = (currentIndex_${this._varCounter} + 1) % urls_${this._varCounter}.length;
        updateImage_${this._varCounter}();
    });
    
    createDots_${this._varCounter}();
    
    ${carruselVar}.appendChild(${imgDisplayVar});
    ${carruselVar}.appendChild(${prevBtnVar});
    ${carruselVar}.appendChild(${nextBtnVar});
    ${carruselVar}.appendChild(${dotsContainerVar});
    _container.appendChild(${carruselVar});
`;
    }

    /* Formulario */
    async transpilarFormulario(nodo, parametros, moduloYFera, tablaSimbolos) {
        const estilos = nodo.estilos && Array.isArray(nodo.estilos) ? nodo.estilos.join(' ') : '';
        const contenido = await this.transpilarCuerpo(nodo.contenido, parametros, moduloYFera, tablaSimbolos);
        let submitJS = '';
        const formVar = this._uid('form');

        if (nodo.submit) {
            submitJS = await this.transpilarSubmit(nodo.submit, parametros, moduloYFera, tablaSimbolos);
        }

        if (estilos) {
            return `
    const ${formVar} = document.createElement('form');
    ${formVar}.className = '${estilos}';
    ${contenido}
    ${submitJS}
    _container.appendChild(${formVar});
`;
        } else {
            return `
    const ${formVar} = document.createElement('form');
    ${contenido}
    ${submitJS}
    _container.appendChild(${formVar});
`;
        }
    }

    /* Input */
    async transpilarInput(nodo, parametros, moduloYFera, tablaSimbolos) {
        const estilos = nodo.estilos && Array.isArray(nodo.estilos) ? nodo.estilos.join(' ') : '';
        let id = '', label = '', value = '';

        if (nodo.propiedades) {
            for (const prop of nodo.propiedades) {
                const valor = await this.transpilarExpresion(prop.valor, parametros, tablaSimbolos);
                if (prop.clave === 'id') id = valor;
                if (prop.clave === 'label') label = valor;
                if (prop.clave === 'value') value = valor;
            }
        }

        const tipoInput = nodo.tipo === 'INPUT_TEXT' ? 'text' : (nodo.tipo === 'INPUT_NUMBER' ? 'number' : 'checkbox');
        const checkedAttr = (nodo.tipo === 'INPUT_BOOL' && value === 'true') ? '.checked = true' : '';
        const inputGroupVar = this._uid('inputGroup');
        const labelVar = this._uid('label');
        const inputVar = this._uid('input');

        if (estilos) {
            return `
    const ${inputGroupVar} = document.createElement('div');
    ${inputGroupVar}.className = 'input-group';
    
    const ${labelVar} = document.createElement('label');
    ${labelVar}.htmlFor = '${id}';
    ${labelVar}.textContent = ${label};
    
    const ${inputVar} = document.createElement('input');
    ${inputVar}.type = '${tipoInput}';
    ${inputVar}.id = '${id}';
    ${inputVar}.name = '${id}';
    ${inputVar}.className = '${estilos}';
    if (${value}) ${inputVar}.value = ${value};
    ${checkedAttr}
    
    ${inputGroupVar}.appendChild(${labelVar});
    ${inputGroupVar}.appendChild(${inputVar});
    _form.appendChild(${inputGroupVar});
`;
        } else {
            return `
    const ${inputGroupVar} = document.createElement('div');
    ${inputGroupVar}.className = 'input-group';
    
    const ${labelVar} = document.createElement('label');
    ${labelVar}.htmlFor = '${id}';
    ${labelVar}.textContent = ${label};
    
    const ${inputVar} = document.createElement('input');
    ${inputVar}.type = '${tipoInput}';
    ${inputVar}.id = '${id}';
    ${inputVar}.name = '${id}';
    if (${value}) ${inputVar}.value = ${value};
    ${checkedAttr}
    
    ${inputGroupVar}.appendChild(${labelVar});
    ${inputGroupVar}.appendChild(${inputVar});
    _form.appendChild(${inputGroupVar});
`;
        }
    }

    /* Submit */
    async transpilarSubmit(nodo, parametros, moduloYFera, tablaSimbolos) {
        const estilos = nodo.estilos && Array.isArray(nodo.estilos) ? nodo.estilos.join(' ') : '';
        let label = 'Submit';
        let funcion = '';

        if (nodo.propiedades) {
            for (const prop of nodo.propiedades) {
                const valor = await this.transpilarExpresion(prop.valor, parametros, tablaSimbolos);
                if (prop.clave === 'label') label = valor;
                if (prop.clave === 'function') funcion = valor;
            }
        }

        const submitVar = this._uid('submit');
        const estilosAttr = estilos ? `${submitVar}.className = '${estilos}';` : '';

        if (funcion) {
            return `
    const ${submitVar} = document.createElement('button');
    ${submitVar}.type = 'submit';
    ${submitVar}.textContent = ${label};
    ${estilosAttr}
    _form.appendChild(${submitVar});
    
    _form.addEventListener('submit', async (e) => {
        e.preventDefault();
        const formData = new FormData(_form);
        const data = {};
        for (let [key, val] of formData.entries()) {
            data[key] = val;
        }
        ${funcion}(data);
    });
`;
        } else {
            return `
    const ${submitVar} = document.createElement('button');
    ${submitVar}.type = 'submit';
    ${submitVar}.textContent = ${label};
    ${estilosAttr}
    _form.appendChild(${submitVar});
`;
        }
    }

    /* For Each */
    async transpilarForEach(nodo, parametros, moduloYFera, tablaSimbolos) {
        const arreglo = nodo.arreglo;
        const iterador = nodo.iterador;
        const cuerpo = await this.transpilarCuerpo(nodo.cuerpo, parametros, moduloYFera, tablaSimbolos);
        let emptyJS = '';

        if (nodo.empty && nodo.empty.cuerpo) {
            emptyJS = await this.transpilarCuerpo(nodo.empty.cuerpo, parametros, moduloYFera, tablaSimbolos);
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

    /* Metodo que permite transpilar un for complejo*/
    async transpilarForComplejo(nodo, parametros, moduloYFera, tablaSimbolos) {
        const trackVar = nodo.track || '__index';
        let emptyJS = '';

        if (nodo.empty && nodo.empty.cuerpo) {
            emptyJS = await this.transpilarCuerpo(nodo.empty.cuerpo, parametros, moduloYFera, tablaSimbolos);
        }

        if (!nodo.iteradores || nodo.iteradores.length === 0) {
            return '';
        }

        const arreglos = nodo.iteradores.map(iter => iter.arreglo);
        const iteradores = nodo.iteradores.map(iter => iter.iterador);

        const condicionExistencia = arreglos.map(arr => `${arr} !== null && ${arr} !== undefined`).join(' && ');
        const condicionLongitud = arreglos.map(arr => `${arr}.length > 0`).join(' && ');

        const minLengthCode = `Math.min(${arreglos.map(arr => `${arr}.length`).join(', ')})`;

        const cuerpo = await this.transpilarCuerpo(nodo.cuerpo, parametros, moduloYFera, tablaSimbolos);

        const iterationVar = this._uid('maxIter');

        return `
    if (${condicionExistencia} && ${condicionLongitud}) {
        const ${iterationVar} = ${minLengthCode};
        for (let ${trackVar} = 0; ${trackVar} < ${iterationVar}; ${trackVar}++) {
            ${iteradores.map((it, idx) => `const ${it} = ${arreglos[idx]}[${trackVar}];`).join('\n            ')}
            ${cuerpo}
        }
    } else {
        ${emptyJS}
    }
`;
    }

    /*Metodo que permite transpilar un if */
    async transpilarIf(nodo, parametros, moduloYFera, tablaSimbolos) {
        const condicion = await this.transpilarExpresion(nodo.condicion, parametros, tablaSimbolos);
        const cuerpo = await this.transpilarCuerpo(nodo.cuerpo, parametros, moduloYFera, tablaSimbolos);
        let continuacionJS = '';

        if (nodo.continuacion) {
            continuacionJS = await this.transpilarElseIf(nodo.continuacion, parametros, moduloYFera, tablaSimbolos);
        }

        return `
    if (${condicion}) {
        ${cuerpo}
    } ${continuacionJS}
`;
    }

    /* Metodo que permite transpilar las instrucciones Else If y Else */
    async transpilarElseIf(nodo, parametros, moduloYFera, tablaSimbolos) {
        if (nodo.tipo === 'ELSE_IF') {
            const condicion = await this.transpilarExpresion(nodo.condicion, parametros, tablaSimbolos);
            const cuerpo = await this.transpilarCuerpo(nodo.cuerpo, parametros, moduloYFera, tablaSimbolos);
            let continuacionJS = '';

            if (nodo.continuacion) {
                continuacionJS = await this.transpilarElseIf(nodo.continuacion, parametros, moduloYFera, tablaSimbolos);
            }

            return `else if (${condicion}) {
        ${cuerpo}
    } ${continuacionJS}`;
        } else if (nodo.tipo === 'ELSE_FINAL') {
            const cuerpo = await this.transpilarCuerpo(nodo.cuerpo, parametros, moduloYFera, tablaSimbolos);
            return `else {
        ${cuerpo}
    }`;
        }
        return '';
    }

    /* Metodo que permite transpilar un Switch */
    async transpilarSwitch(nodo, parametros, moduloYFera, tablaSimbolos) {
        const evalua = await this.transpilarExpresion(nodo.evalua, parametros, tablaSimbolos);
        let casosJS = '';

        if (nodo.casos && Array.isArray(nodo.casos)) {
            for (const caso of nodo.casos) {
                if (caso.tipo === 'CASO_SWITCH') {
                    const valor = await this.transpilarExpresion(caso.valor_comparacion, parametros, tablaSimbolos);
                    const cuerpo = await this.transpilarCuerpo(caso.cuerpo, parametros, moduloYFera, tablaSimbolos);
                    casosJS += `
        case ${valor}: {
            ${cuerpo}
            break;
        }`;
                } else if (caso.tipo === 'DEFAULT_SWITCH') {
                    const cuerpo = await this.transpilarCuerpo(caso.cuerpo, parametros, moduloYFera, tablaSimbolos);
                    casosJS += `
        default: {
            ${cuerpo}
            break;
        }`;
                }
            }
        }

        return `
    switch (${evalua}) {${casosJS}
    }
`;
    }

    /* Metodo que permite transpilar una Invocacion de componente */
    async transpilarInvocacionComponente(nodo, parametros, moduloYFera, tablaSimbolos) {
        const nombreComponente = nodo.id;
        let argumentosJS = '';
        const componentVar = this._uid('comp');

        if (nodo.argumentos && Array.isArray(nodo.argumentos)) {
            const args = [];
            for (const arg of nodo.argumentos) {
                args.push(await this.transpilarExpresion(arg, parametros, tablaSimbolos));
            }
            argumentosJS = args.join(', ');
        }

        return `
    const ${componentVar} = ${nombreComponente}(${argumentosJS});
    _container.appendChild(${componentVar});
`;
    }

    /* Metodo que permite transpilar Expresiones */
    async transpilarExpresion(expr, parametros, tablaSimbolos) {
        if (!expr) return 'null';

        switch (expr.tipo) {
            case 'VALOR':
                if (typeof expr.valor === 'number') return expr.valor;
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

    /* Metodo que permite transpilar una Cadena interpolada */
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

    /*Metodo que permite mapear operadores */
    mapearOperador(operador) {
        const mapa = {
            'SUMA': '+', 'RESTA': '-', 'MULTIPLICACION': '*', 'DIVISION': '/',
            'MODULO': '%', 'MAYOR': '>', 'MENOR': '<', 'MAYOR_IGUAL': '>=',
            'MENOR_IGUAL': '<=', 'IGUALACION': '===', 'DIFERENCIA': '!==',
            'AND': '&&', 'OR': '||'
        };
        return mapa[operador] || operador;
    }

    /* MEtodo que permite extaer los parametros de un componente */
    extraerParametros(parametrosAST) {
        if (!parametrosAST || !Array.isArray(parametrosAST)) return [];

        return parametrosAST.map(param => {
            if (param.tipo === 'PARAMETRO_DEF') {
                return { nombre: param.id, tipo: param.tipado, esArreglo: false };
            } else if (param.tipo === 'PARAMETRO_DEF_ARREGLO') {
                return { nombre: param.id, tipo: param.tipado, esArreglo: true };
            }
            return null;
        }).filter(p => p !== null);
    }
}