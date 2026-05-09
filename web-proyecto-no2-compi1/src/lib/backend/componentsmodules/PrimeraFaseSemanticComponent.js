
import { TablaSimbolos } from "../semanticsyfera/TablaSimbolos";

import { SimboloComponente } from "../semanticsyfera/SimboloComponente";

export class PrimeraFaseSemanticComponent {

    constructor(compilador, manejadorDb) {
        this.compilador = compilador;
        this.manejadorDb = manejadorDb;
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

        if (tablaSimbolosComponentes.existeLocal(nombreComponente)) {
            const simboloExistente = tablaSimbolosComponentes.obtener(nombreComponente);

            this.compilador.agregarError(
                recursoComponente.nombreArchivo,
                nombreComponente,
                'Semantico',
                `El componente: '${nombreComponente}' ya fue definido ` +
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
                rutaRelativa: recursoComponente.rutaRelativa,
                estilosUsados: []
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