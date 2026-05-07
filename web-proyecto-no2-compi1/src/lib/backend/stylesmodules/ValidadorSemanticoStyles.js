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

        for (const hijo of moduloYFera.modulosHijos) {
            await this.validarEstilos(hijo);
        }
    }

    /*Metodo que analiza un bloque de CSS mergeado y construye su tabla de símbolos */
    async analizarBloqueStyles(recursoEstilo, tablaSimbolosEstilos) {
        try {
            // Limpiar errores previos del parser
            parserStyles.yy.errores = [];

            // Parsear el contenido del archivo .styles
            const astStyles = parserStyles.parse(recursoEstilo.contenido);

            // Verificar errores de sintaxis del parser
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
                return; // Archivo vacío o sin reglas
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

        } catch (error) {
            this.compilador.agregarError(
                recursoEstilo.nombreArchivo,
                recursoEstilo.rutaRelativa,
                'Compilacion',
                `Error al parsear estilos: ${error.message}`
            );
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

}