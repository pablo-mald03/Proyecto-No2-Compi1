import { TablaSimbolos } from "../semanticsyfera/TablaSimbolos";

import parserStyles from "$lib/analizador/compiler/estilos-config";

import { SimboloEstilos } from "../SimboloEstilos";

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
                `Selector duplicado: '${nombreSelector}' ya fue definido en ${simboloExistente.linea}`,
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

        tablaSimbolosEstilos.setVariable(nombreSelector, simbolo);
        
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

        const inicio = this.evaluarExpresionSimple(nodoFor.inicio); 
        const fin = this.evaluarExpresionSimple(nodoFor.fin);       
        const inclusivo = nodoFor.inclusivo; 
        const variableFor = nodoFor.variable; 

        if (inicio === null || fin === null) {
            this.compilador.agregarError(
                recursoEstilo.nombreArchivo,
                variableFor,
                'Semantico',
                'No se pudo evaluar el rango del ciclo @for',
                nodoFor.loc_linea,
                nodoFor.loc_columna
            );
            return;
        }

        //Validacion de desbalance de limites
        if (inicio > fin) {
            this.compilador.agregarError(
                recursoEstilo.nombreArchivo,
                variableFor,
                'Semantico',
                `El rango del @for es inválido: inicio (${inicio}) > fin (${fin})`,
                nodoFor.loc_linea,
                nodoFor.loc_columna
            );
            return;
        }

        const finReal = inclusivo ? fin : fin - 1;
        
        for (let i = inicio; i <= finReal; i++) {

            for (const elementoFor of nodoFor.cuerpo) {
                if (elementoFor.tipo === 'DEC_ESTILO_DINAMICO') {
                    await this.expandirSelectorDinamico(
                        elementoFor,
                        i,
                        variableFor,
                        recursoEstilo,
                        tablaSimbolosEstilos
                    );
                }
            }
        }
    }

    /*Metodo que permite ir armando las clases con su respectivo valor dinamico del ciclo*/
    async expandirSelectorDinamico(nodoDinamico, valorIteracion, variableFor, recursoEstilo, tablaSimbolosEstilos) {
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

        const simbolo = new SimboloEstilos(
            nombreSelectorReal,           
            'SELECTOR_DINAMICO',            
            {
                parent: nodoDinamico.parent || null,
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

        tablaSimbolosEstilos.setVariable(nombreSelectorReal, simbolo);
    }


    /*Metodo que permite resolver operaciones literales numericas*/
    evaluarExpresionSimple(expresion) {
        if (!expresion) return null;
        
        if (expresion.tipo === 'VALOR' && typeof expresion.valor === 'number') {
            return expresion.valor;
        }
        
        if (typeof expresion === 'number') {
            return expresion;
        }
        
        return null;
    }

    /*Metodo que btiene el patrón original del selector para el reporte de cadenas*/
    obtenerPatronSelector(partes) {
        return partes.map(p => {
            if (p.tipo === 'VARIABLE_REF') return `\${${p.nombre}}`;
            return p.valor;
        }).join('');
    }

}