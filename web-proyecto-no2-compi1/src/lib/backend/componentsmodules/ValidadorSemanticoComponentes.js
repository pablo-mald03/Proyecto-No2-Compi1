import { SimboloComponente } from "../semanticsyfera/SimboloComponente";
import parserComponent from "$lib/analizador/compiler/component-config";

/*Clase delegada para llevar la logica de la validacion semantica de los componentes */
export class ValidadorSemanticoComponentes {

    constructor(compilador, manejadorDb) {
        this.compilador = compilador;
        this.manejadorDb = manejadorDb;
    }

    /*Metodo que permite validar los componentes asociados a un modulo yfera */
    async validarComponentes(moduloYFera) {

        for (const recursoComponente of moduloYFera.recursos.componentes) {
            await this.analizarBloqueComponente(
                recursoComponente,
                moduloYFera.tablaSimbolosComponentes
            );
        }

        for (const hijo of moduloYFera.modulosHijos) {
            await this.validarComponentes(hijo);
        }
    }

    /*Metodo que permite analizar los bloques de componentes */
    async analizarBloqueComponente(recursoComponente, tablaSimbolosComponentes) {
        try {
            parserComponent.yy.errores = [];

            const astComponentes = parserComponent.parse(recursoComponente.contenido);

            if (parserComponent.yy && parserComponent.yy.errores && parserComponent.yy.errores.length > 0) {
                const reporte = parserComponent.yy.errores.map(err => ({
                    origen: recursoComponente.nombreArchivo,
                    lexema: err.lexema || 'N/A',
                    tipo: err.tipo || 'Sintactico',
                    linea: err.fila || -1,
                    columna: err.columna || -1,
                    descripcion: err.descripcion || 'Error de sintaxis en componente'
                }));
                this.compilador.agregarErrores(reporte);
                return;
            }

            if (!astComponentes || !Array.isArray(astComponentes)) {
                return; 
            }

            // PRIMERA FASE: Registrar componentes y detectar duplicados
            for (const nodo of astComponentes) {
                await this.ejecutarPrimeraPasada(nodo, recursoComponente, tablaSimbolosComponentes);
            }

        } catch (error) {
            this.compilador.agregarError(
                recursoComponente.nombreArchivo,
                recursoComponente.rutaRelativa,
                'Compilacion',
                `Error al parsear componente: ${error.message}`
            );
        }
    }

    /*Metodo que permite ejecutar la primera fase de la validacion de componentes */
    async ejecutarPrimeraPasada(nodo, recursoComponente, tablaSimbolosComponentes) {
        if (nodo.tipo === 'LLAMADA_FUNCION') {
            await this.registrarComponente(nodo, recursoComponente, tablaSimbolosComponentes);
        }
    }

    /*Metodo que permite registrar un componente en la tabla de simbolos */
    async registrarComponente(nodo, recursoComponente, tablaSimbolosComponentes) {
        const nombreComponente = nodo.id;

        // Verificar si ya existe en la tabla de símbolos
        if (tablaSimbolosComponentes.existeLocal(nombreComponente)) {
            const simboloExistente = tablaSimbolosComponentes.obtener(nombreComponente);

            this.compilador.agregarError(
                recursoComponente.nombreArchivo,
                nombreComponente,
                'Semantico',
                `Componente duplicado: '${nombreComponente}' ya fue definido ` +
                `en la linea ${simboloExistente.linea} del archivo ${simboloExistente.valor.archivoOrigen}`,
                nodo.linea,
                nodo.columna
            );
            return;
        }

        const parametros = this.extraerParametros(nodo.parametros);

        const simbolo = new SimboloComponente(
            nombreComponente,
            parametros,
            {
                cuerpo: nodo,                   
                archivoOrigen: recursoComponente.nombreArchivo,
                rutaRelativa: recursoComponente.rutaRelativa
            },
            nodo.linea,
            nodo.columna
        );

        tablaSimbolosComponentes.insertar(nombreComponente, simbolo);
    }

    /*Metodo que extrae y valida los parametros de un componente*/
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