import { TablaSimbolos } from "../semanticsyfera/TablaSimbolos";

import parserStyles from "$lib/analizador/compiler/estilos-config";

import { SimboloEstilos } from "../semanticsyfera/SimboloEstilos";

/*Clase delegada para poder hacer la validacion semantica de los estilos */
export class ValidadorSemanticoStyles {

    constructor(compilador, manejadorDb) {
        this.compilador = compilador;
        this.manejadorDb = manejadorDb;
    }

    /*Metodo que permite validar recursivamente los estilos de cada modulo*/
    async validarEstilos(moduloYFera) {
        for (const recursoEstilo of moduloYFera.recursos.estilos) {
            await this.analizarBloqueStyles(
                recursoEstilo,
                moduloYFera.tablaSimbolosEstilos
            );
        }

        /*Ultima fase de compilacion */
        this.compilarCSS(moduloYFera);

        for (const hijo of moduloYFera.modulosHijos) {
            await this.validarEstilos(hijo);
        }
    }

    /*Metodo que analiza un bloque de CSS mergeado y construye su tabla de símbolos */
    async analizarBloqueStyles(recursoEstilo, tablaSimbolosEstilos) {
        try {
            parserStyles.yy.errores = [];

            const astStyles = parserStyles.parse(recursoEstilo.contenido);

            if (parserStyles.yy && parserStyles.yy.errores && parserStyles.yy.errores.length > 0) {
                const reporte = parserStyles.yy.errores.map(err => ({
                    origen: recursoEstilo.nombreArchivo,
                    lexema: err.lexema || 'N/A',
                    tipo: err.tipo || 'Sintactico',
                    linea: err.fila || -1,
                    columna: err.columna || -1,
                    descripcion: err.descripcion || 'Error de sintaxis en estilos'
                }));
                this.compilador.agregarErrores(reporte);
                return;
            }

            if (!astStyles || !Array.isArray(astStyles)) {
                return; 
            }

            /* PRIMERA FASE: Registrar clases normales */
            for (const nodo of astStyles) {
                await this.ejecutarPrimeraPasada(nodo, recursoEstilo, tablaSimbolosEstilos);
            }

            /*SEGUNDA FASE: Procesar @for*/
            for (const nodo of astStyles) {
                await this.ejecutarSegundaPasada(nodo, recursoEstilo, tablaSimbolosEstilos);
            }

            /*TERCERA FASE: Procesar todas las clases ya definidas*/
            for (const nodo of astStyles) {
                await this.ejecutarTerceraPasada(nodo, recursoEstilo, tablaSimbolosEstilos);
            }

            /*CUARTA FASE SUBFASE ALFA: Ejecucion de herencias*/
            await this.ejecutarCuartaFaseAlfa(tablaSimbolosEstilos, recursoEstilo);

            /*CUARTA FASE SUBFASE BETA: Evaluar todas las expresiones */
            await this.ejecutarCuartaFaseBeta(tablaSimbolosEstilos, recursoEstilo);

        } catch (error) {
            this.compilador.agregarError(
                recursoEstilo.nombreArchivo,
                recursoEstilo.rutaRelativa,
                'Compilacion',
                `Error al parsear estilos: ${error.message}`
            );
        }
    }

    /*Generacion del css compilado */
    compilarCSS(moduloYFera) {
        const tablaSimbolos = moduloYFera.tablaSimbolosEstilos;
        let cssCompilado = '';

        for (const [nombreSelector, simbolo] of tablaSimbolos.variables) {
            const bloqueCSS = this.generarBloqueCSS(nombreSelector, simbolo);
            if (bloqueCSS) {
                cssCompilado += bloqueCSS + '\n';
            }
        }

        moduloYFera.recursosCompilados.compiledStyles = cssCompilado;
        console.log(cssCompilado);
    }

    /*Metodo que permite generar un bloque css */
    generarBloqueCSS(nombreSelector, simbolo) {
        if (!simbolo.valor || !simbolo.valor.propiedades || simbolo.valor.propiedades.length === 0) {
            return null;
        }

        let css = `.${nombreSelector} {\n`;

        for (const prop of simbolo.valor.propiedades) {
            const lineaCSS = this.generarPropiedadCSS(prop);
            if (lineaCSS) {
                css += `    ${lineaCSS}\n`;
            }
        }

        css += '}';

        return css;
    }

    /*Metodo que convierte una propiedad en un estilo css*/
    generarPropiedadCSS(prop) {
        if (!prop || !prop.nombre) return null;

        switch (prop.tipo) {
            case 'PROPIEDAD_ESTILO':
                return this.generarPropiedadSimpleCSS(prop);

            case 'PROPIEDAD_COMPUESTA':
                return this.generarPropiedadCompuestaCSS(prop);

            default:
                return null;
        }
    }

    /*Generacion de css de una propiedad compuesta */
    generarPropiedadSimpleCSS(prop) {
        const nombreCSS = this.traducirNombrePropiedad(prop.nombre);
        const valorCSS = this.formatearValorCSS(prop.valor);

        if (valorCSS === null) return null;

        return `${nombreCSS}: ${valorCSS};`;
    }

    /*Metodo que genera las propiedades compuestas del css*/
    generarPropiedadCompuestaCSS(prop) {
        const nombreCSS = this.traducirNombrePropiedad(prop.nombre);

        const anchoCSS = this.formatearValorCSS(prop.ancho);
        const estiloCSS = prop.estilo?.valor || 'solid';
        const colorCSS = this.formatearValorCSS(prop.color);

        if (!anchoCSS || !colorCSS) return null;

        return `${nombreCSS}: ${anchoCSS} ${estiloCSS} ${colorCSS};`;
    }

    /*Metodo que permite traducir la propiedad*/
    traducirNombrePropiedad(nombreInterno) {
        return nombreInterno;
    }

    /*Metodo que formatea un valor a clase css*/
    formatearValorCSS(valor) {
        if (!valor) return null;

        switch (valor.tipo) {
            case 'VALOR_NUMERICO':
                return valor.valorFormateado || `${valor.valor}${valor.unidad || 'px'}`;
            case 'VALOR_LITERAL':
                if (valor.subtipo === 'COLOR_HEX') {
                    return valor.valor; 
                }
                if (valor.subtipo === 'COLOR_PRESET') {
                    return valor.valor; 
                }
                return valor.valor; 

            case 'COLOR_RGB':
                return valor.valorFormateado || `rgb(${valor.r}, ${valor.g}, ${valor.b})`;

            case 'VALOR':
                return `${valor.valor}px`; 

            default:
                if (valor.valorFormateado) {
                    return valor.valorFormateado;
                }
                return null;
        }
    }

    /*Metodo que permite ejecutar la primera pasada reconocimiento de clases */
    async ejecutarPrimeraPasada(nodo, recursoEstilo, tablaSimbolosEstilos) {

        if (nodo.tipo === 'DEC_ESTILO_NORMAL') {
            await this.registrarSelectorNormal(nodo, recursoEstilo, tablaSimbolosEstilos);
        }
    }

    /*Metodo que se encarga de registrar una clase normal*/
    async registrarSelectorNormal(nodo, recursoEstilo, tablaSimbolosEstilos) {
        const nombreSelector = nodo.selector;

        if (tablaSimbolosEstilos.existeLocal(nombreSelector)) {
            const simboloExistente = tablaSimbolosEstilos.obtener(nombreSelector);

            this.compilador.agregarError(
                recursoEstilo.nombreArchivo,
                nombreSelector,
                'Semantico',
                `Selector duplicado: '${nombreSelector}' ya fue definido en la linea: ${simboloExistente.linea} del archivo: ${recursoEstilo.nombreArchivo}`,
                nodo.loc_linea,
                nodo.loc_columna
            );
            return;
        }

        const simbolo = new SimboloEstilos(
            nombreSelector,
            'SELECTOR',
            {
                parent: nodo.parent || null,
                propiedades: nodo.propiedades,
                archivoOrigen: recursoEstilo.nombreArchivo,
                rutaRelativa: recursoEstilo.rutaRelativa,
                esDinamico: false
            },
            nodo.loc_linea,
            nodo.loc_columna
        );

        tablaSimbolosEstilos.insertar(nombreSelector, simbolo);

    }

    /*Metodo que permite ejecutar la segunda pasada de compilacion*/
    async ejecutarSegundaPasada(nodo, recursoEstilo, tablaSimbolosEstilos) {
        if (nodo.tipo === 'CICLO_FOR') {
            await this.procesarCicloFor(nodo, recursoEstilo, tablaSimbolosEstilos);
        }
    }

    /*Metodo que permite procesar todo lo necesario para poder generar mas ids dinamicos*/
    async procesarCicloFor(nodoFor, recursoEstilo, tablaSimbolosEstilos) {
        if (!nodoFor.cuerpo || !Array.isArray(nodoFor.cuerpo)) {
            this.compilador.agregarError(
                recursoEstilo.nombreArchivo,
                '@for',
                'Semantico',
                'El ciclo @for no tiene cuerpo o está vacío',
                nodoFor.loc_linea,
                nodoFor.loc_columna
            );
            return;
        }

        const inicio = this.evaluarExpresion(nodoFor.inicio, {});
        const fin = this.evaluarExpresion(nodoFor.fin, {});
        const inclusivo = nodoFor.inclusivo;
        const variableFor = nodoFor.variable;

        const esValido = this.esForValido(inicio, fin, variableFor, nodoFor, recursoEstilo);

        if (!esValido) {
            return;
        }

        const finReal = inclusivo ? fin : fin - 1;

        for (let i = inicio; i <= finReal; i++) {
            const contexto = { [variableFor]: i };

            for (const elementoFor of nodoFor.cuerpo) {
                if (elementoFor.tipo === 'DEC_ESTILO_DINAMICO') {
                    await this.expandirSelectorDinamico(
                        elementoFor,
                        i,
                        variableFor,
                        contexto,
                        recursoEstilo,
                        tablaSimbolosEstilos
                    );
                }
            }
        }
    }

    /*Metodo que permite validar que los limites de los ciclos for esten correctos */
    esForValido(inicio, fin, variableFor, nodoFor, recursoEstilo) {
        // Validar que se pudieron evaluar
        if (inicio === null || fin === null) {
            this.compilador.agregarError(
                recursoEstilo.nombreArchivo,
                variableFor,
                'Semantico',
                `No se pudo evaluar el ciclo @for. Las expresiones de inicio y fin deben ser valores numericos.`,
                nodoFor.loc_linea,
                nodoFor.loc_columna
            );
            return false;
        }

        if (!Number.isInteger(inicio) || !Number.isInteger(fin)) {
            this.compilador.agregarError(
                recursoEstilo.nombreArchivo,
                variableFor,
                'Semantico',
                `Los limites del @for deben ser numeros enteros. ` +
                `Se definio inicio=${inicio}, fin=${fin}`,
                nodoFor.loc_linea,
                nodoFor.loc_columna
            );
            return false;
        }

        if (inicio > fin) {
            this.compilador.agregarError(
                recursoEstilo.nombreArchivo,
                variableFor,
                'Semantico',
                `El rango del @for es invalido: inicio (${inicio}) > fin (${fin})`,
                nodoFor.loc_linea,
                nodoFor.loc_columna
            );
            return false;
        }

        return true;
    }

    /*Metodo que permite ir armando las clases con su respectivo valor dinamico del ciclo*/
    async expandirSelectorDinamico(
        nodoDinamico,
        valorIteracion,
        variableFor,
        contexto,
        recursoEstilo,
        tablaSimbolosEstilos
    ) {
        const partes = nodoDinamico.selector.partes || [];
        let nombreSelectorReal = '';

        for (const parte of partes) {
            if (parte.tipo === 'VARIABLE_REF' && parte.nombre === variableFor) {
                nombreSelectorReal += valorIteracion;
            } else if (parte.tipo === 'TEXTO') {
                nombreSelectorReal += parte.valor;
            } else if (parte.tipo === 'VARIABLE_REF') {
                this.compilador.agregarError(
                    recursoEstilo.nombreArchivo,
                    parte.nombre,
                    'Semantico',
                    `Variable '${parte.nombre}' no es la variable del @for (${variableFor})`,
                    parte.loc_linea || nodoDinamico.loc_linea,
                    parte.loc_columna || nodoDinamico.loc_columna
                );
                return;
            }
        }

        if (tablaSimbolosEstilos.existeLocal(nombreSelectorReal)) {
            const simboloExistente = tablaSimbolosEstilos.obtener(nombreSelectorReal);
            this.compilador.agregarError(
                recursoEstilo.nombreArchivo,
                nombreSelectorReal,
                'Semantico',
                `Selector duplicado: '${nombreSelectorReal}' ` +
                `ya fue definido en linea ${simboloExistente.linea}`,
                nodoDinamico.loc_linea,
                nodoDinamico.loc_columna
            );
            return;
        }

        let parentEvaluado = null;
        if (nodoDinamico.parent && nodoDinamico.parent.partes) {
            parentEvaluado = this.evaluarSelectorDinamico(
                nodoDinamico.parent.partes,
                variableFor,
                valorIteracion
            );
        }

        const simbolo = new SimboloEstilos(
            nombreSelectorReal,
            'SELECTOR_DINAMICO',
            {
                parent: parentEvaluado,
                propiedades: nodoDinamico.propiedades,
                archivoOrigen: recursoEstilo.nombreArchivo,
                rutaRelativa: recursoEstilo.rutaRelativa,
                esDinamico: true,
                variableOriginal: variableFor,
                valorIteracion: valorIteracion,
                patronOriginal: this.obtenerPatronSelector(partes)
            },
            nodoDinamico.loc_linea,
            nodoDinamico.loc_columna
        );

        tablaSimbolosEstilos.insertar(nombreSelectorReal, simbolo);
    }

    /*Metodo que evalua el selector dinamico*/
    evaluarSelectorDinamico(partes, variableFor, valorIteracion) {
        let resultado = '';
        for (const parte of partes) {
            if (parte.tipo === 'VARIABLE_REF' && parte.nombre === variableFor) {
                resultado += valorIteracion;
            } else if (parte.tipo === 'TEXTO') {
                resultado += parte.valor;
            }
        }
        return resultado;
    }

    /*Metodo que btiene el patrón original del selector para el reporte de cadenas*/
    obtenerPatronSelector(partes) {
        return partes.map(p => {
            if (p.tipo === 'VARIABLE_REF') return `\${${p.nombre}}`;
            return p.valor;
        }).join('');
    }

    /*Metodo que permite validar por completo todas las expresiones posibles */
    evaluarExpresion(expresion, contextoVariables = {}) {
        if (!expresion) return null;

        switch (expresion.tipo) {
            case 'VALOR':
                return expresion.valor;

            case 'VARIABLE':
                if (contextoVariables.hasOwnProperty(expresion.nombre)) {
                    return contextoVariables[expresion.nombre];
                }
                return null;

            case 'OPERACION':
                return this.evaluarOperacion(expresion, contextoVariables);

            case 'OPERACION_UNARIA':
                return this.evaluarOperacionUnaria(expresion, contextoVariables);

            case 'EXPRESION_SIMPLE':
            case 'EXPRESION_COMPUESTA':
                return this.evaluarExpresion(expresion.expresion, contextoVariables);

            default:
                return null;
        }
    }

    /*Metodo que permite retornar el resultado de las operaciones */
    evaluarOperacion(expresion, contextoVariables) {
        const izq = this.evaluarExpresion(expresion.izq, contextoVariables);
        const der = this.evaluarExpresion(expresion.der, contextoVariables);

        if (izq === null || der === null) return null;

        switch (expresion.operador) {
            // Matemáticos
            case 'SUMA': return izq + der;
            case 'RESTA': return izq - der;
            case 'MULTIPLICACION': return izq * der;
            case 'DIVISION':
                if (der === 0) return null;
                return izq / der;
            case 'MODULO':
                if (der === 0) return null;
                return izq % der;

            case 'MAYOR': return izq > der ? 1 : 0;
            case 'MENOR': return izq < der ? 1 : 0;
            case 'MAYOR_IGUAL': return izq >= der ? 1 : 0;
            case 'MENOR_IGUAL': return izq <= der ? 1 : 0;
            case 'IGUALACION': return izq === der ? 1 : 0;
            case 'DIFERENCIA': return izq !== der ? 1 : 0;
            case 'AND': return (izq && der) ? 1 : 0;
            case 'OR': return (izq || der) ? 1 : 0;

            default:
                return null;
        }
    }

    /*Metodo que permite evaluar las operaciones unarias*/
    evaluarOperacionUnaria(expresion, contextoVariables) {
        const valor = this.evaluarExpresion(expresion.valor, contextoVariables);
        if (valor === null) return null;

        switch (expresion.operador) {
            case 'MENOS_UNARIO': return -valor;
            case 'NOT': return valor ? 0 : 1;
            default:
                return null;
        }
    }


    /*Metodo que permite ejecutar la tercera pasada*/
    async ejecutarTerceraPasada(nodo, recursoEstilo, tablaSimbolosEstilos) {
        if (nodo.tipo === 'DEC_ESTILO_NORMAL' && nodo.parent) {
            await this.validarHerencia(nodo, recursoEstilo, tablaSimbolosEstilos);
        }
    }

    /*Metodo que valida la semantica para poder marcar la herencia de clases*/
    async validarHerencia(nodo, recursoEstilo, tablaSimbolosEstilos) {
        const nombreSelector = nodo.selector;
        const nombreParent = nodo.parent;

        if (!tablaSimbolosEstilos.existeLocal(nombreParent)) {
            this.compilador.agregarError(
                recursoEstilo.nombreArchivo,
                nombreParent,
                'Semantico',
                `El selector padre '${nombreParent}' no existe. ` +
                `Referenciado por '${nombreSelector}'`,
                nodo.loc_linea,
                nodo.loc_columna
            );
            return;
        }

        const simboloParent = tablaSimbolosEstilos.obtener(nombreParent);
        if (simboloParent && simboloParent.valor && simboloParent.valor.parent === nombreSelector) {
            this.compilador.agregarError(
                recursoEstilo.nombreArchivo,
                nombreParent,
                'Semantico',
                `Herencia circular detectada: '${nombreSelector}' y '${nombreParent}' se extienden mutuamente`,
                nodo.loc_linea,
                nodo.loc_columna
            );
            return;
        }

        const simboloActual = tablaSimbolosEstilos.obtener(nombreSelector);
        if (simboloActual) {
            simboloActual.valor.parentResuelto = nombreParent;
            simboloActual.valor.parentValido = true;
        }
    }

    /*Metodo que permite ir validando herencias en los selectores dinamicos*/
    async validarHerenciaDinamica(nodoDinamico, nombreSelectorReal, recursoEstilo, tablaSimbolosEstilos) {
        if (!nodoDinamico.parent) return;

        let nombreParent;
        if (typeof nodoDinamico.parent === 'string') {
            nombreParent = nodoDinamico.parent;
        } else if (nodoDinamico.parent.partes) {
            nombreParent = this.obtenerPatronSelector(nodoDinamico.parent.partes);
        }

        if (nombreParent && !tablaSimbolosEstilos.existeLocal(nombreParent)) {
            this.compilador.agregarError(
                recursoEstilo.nombreArchivo,
                nombreParent,
                'Semantico',
                `El selector padre '${nombreParent}' no existe. ` +
                `Referenciado por '${nombreSelectorReal}'`,
                nodoDinamico.loc_linea,
                nodoDinamico.loc_columna
            );
        }
    }

    /*Metodo que permite ejecutar la cuarta fase en modo Alfa (Nombre inventado por mi para no poner A). Que ejecuta herencias*/
    async ejecutarCuartaFaseAlfa(tablaSimbolosEstilos, recursoEstilo) {
        for (const [id, simbolo] of tablaSimbolosEstilos.variables) {
            if (simbolo.valor && simbolo.valor.parentResuelto) {
                await this.resolverHerencia(simbolo, tablaSimbolosEstilos, recursoEstilo);
            }
        }
    }

    /*Metodo que permite aplicar las herencias de las propiedades a los simbolos*/
    async resolverHerencia(simboloHijo, tablaSimbolosEstilos, recursoEstilo) {
        const nombrePadre = simboloHijo.valor.parentResuelto;
        const simboloPadre = tablaSimbolosEstilos.obtener(nombrePadre);

        if (!simboloPadre) {
            this.compilador.agregarError(
                recursoEstilo.nombreArchivo,
                nombrePadre,
                'Semantico',
                `No se pudo ejecutar la herencia: el padre '${nombrePadre}' no existe.`,
                simboloHijo.linea,
                simboloHijo.columna
            );
            return;
        }

        if (simboloPadre.valor.parentResuelto && !simboloPadre.valor.herenciaResuelta) {
            await this.resolverHerencia(simboloPadre, tablaSimbolosEstilos, recursoEstilo);
        }

        const propsPadre = simboloPadre.valor.propiedades || [];
        const propsHijo = simboloHijo.valor.propiedades || [];

        const propiedadesFusionadas = this.fusionarPropiedades(propsPadre, propsHijo);

        simboloHijo.valor.propiedades = propiedadesFusionadas;
        simboloHijo.valor.herenciaResuelta = true;
    }

    /*Metodo que permite realizar las herencias de los selectores/clases */
    fusionarPropiedades(propsPadre, propsHijo) {
        const mapaPropiedades = new Map();

        for (const prop of propsPadre) {
            mapaPropiedades.set(prop.nombre, { ...prop, heredado: true });
        }

        for (const prop of propsHijo) {
            mapaPropiedades.set(prop.nombre, { ...prop, heredado: false });
        }

        return Array.from(mapaPropiedades.values());
    }


    /*Fase Beta que permite evaluar las propiedades despues de aplicar los estilos heradados */
    async ejecutarCuartaFaseBeta(tablaSimbolosEstilos, recursoEstilo) {
        for (const [id, simbolo] of tablaSimbolosEstilos.variables) {
            await this.evaluarPropiedadesSimbolo(simbolo, recursoEstilo);
        }
    }

    /*Metodo que recorre las propiedades de cada simbolo */
    async evaluarPropiedadesSimbolo(simbolo, recursoEstilo) {
        if (!simbolo.valor || !simbolo.valor.propiedades) return;

        const propiedadesEvaluadas = [];

        for (const prop of simbolo.valor.propiedades) {
            const propEvaluada = this.evaluarPropiedad(prop, simbolo, recursoEstilo);
            if (propEvaluada) {
                propiedadesEvaluadas.push(propEvaluada);
            }
        }

        simbolo.valor.propiedades = propiedadesEvaluadas;
        simbolo.valor.expresionesResueltas = true;
    }

    /*Metodo que permite evaluar donde si se esta evaluando un estilo normal o esta compuesto por variables del for*/
    evaluarPropiedad(prop, simbolo, recursoEstilo) {
        if (!prop || !prop.tipo) return prop;

        switch (prop.tipo) {
            case 'PROPIEDAD_ESTILO':
                return this.evaluarPropiedadSimple(prop, simbolo);

            case 'PROPIEDAD_COMPUESTA':
                return this.evaluarPropiedadCompuesta(prop, simbolo);

            default:
                return prop;
        }
    }

    /*Metodo que permite evaluar las propiedades simples sin mayores atributos*/
    evaluarPropiedadSimple(prop, simbolo) {
        const valorEvaluado = this.evaluarValorPropiedad(prop.valor, simbolo);

        return {
            tipo: 'PROPIEDAD_ESTILO',
            nombre: prop.nombre,
            valor: valorEvaluado,
            loc_linea: prop.loc_linea,
            loc_columna: prop.loc_columna,
            heredado: prop.heredado || false
        };
    }

    /*Metodo que permite evaluar las propiedades compuestas */
    evaluarPropiedadCompuesta(prop, simbolo) {
        const anchoEvaluado = this.evaluarValorPropiedad(prop.ancho, simbolo);
        const estiloEvaluado = prop.estilo;

        const colorEvaluado = this.evaluarValorPropiedad(prop.color, simbolo);

        return {
            tipo: 'PROPIEDAD_COMPUESTA',
            nombre: prop.nombre,
            ancho: anchoEvaluado,
            estilo: estiloEvaluado,
            color: colorEvaluado,
            loc_linea: prop.loc_linea,
            loc_columna: prop.loc_columna,
            heredado: prop.heredado || false
        };
    }

    /*Metodo que evalua las propiedades en su estado mas simplificado*/
    evaluarValorPropiedad(valor, simbolo) {
        if (!valor) return null;

        const contexto = {};
        if (simbolo.valor.esDinamico && simbolo.valor.variableOriginal) {
            contexto[simbolo.valor.variableOriginal] = simbolo.valor.valorIteracion;
        }

        switch (valor.tipo) {
            case 'VALOR_LITERAL':
                return {
                    tipo: 'VALOR_LITERAL',
                    subtipo: valor.subtipo || null,
                    valor: valor.valor
                };

            case 'EXPRESION_SIMPLE':
            case 'EXPRESION_COMPUESTA':
                {
                    const resultado = this.evaluarExpresion(valor.expresion, contexto);
                    const unidad = valor.unidad || 'px';
                    return {
                        tipo: 'VALOR_NUMERICO',
                        valor: resultado,
                        unidad: unidad,
                        valorFormateado: `${resultado}${unidad}`
                    };
                }

            case 'OPERACION':
            case 'OPERACION_UNARIA':
                {
                    const resultado = this.evaluarExpresion(valor, contexto);
                    return {
                        tipo: 'VALOR_NUMERICO',
                        valor: resultado,
                        unidad: 'px', // Por defecto
                        valorFormateado: `${resultado}px`
                    };
                }

            case 'COLOR_RGB':
                {
                    const r = this.evaluarExpresion(valor.r, contexto);
                    const g = this.evaluarExpresion(valor.g, contexto);
                    const b = this.evaluarExpresion(valor.b, contexto);
                    return {
                        tipo: 'COLOR_RGB',
                        r: r,
                        g: g,
                        b: b,
                        valorFormateado: `rgb(${r}, ${g}, ${b})`
                    };
                }

            case 'VALOR':
                return {
                    tipo: 'VALOR_NUMERICO',
                    valor: valor.valor,
                    unidad: 'px',
                    valorFormateado: `${valor.valor}px`
                };

            default:
                return valor;
        }
    }

}