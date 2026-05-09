import { SimboloComponente } from "../semanticsyfera/SimboloComponente";
import parserComponent from "$lib/analizador/compiler/component-config";
import { TablaSimbolos } from "../semanticsyfera/TablaSimbolos";

import { PrimeraFaseSemanticComponent } from "./PrimeraFaseSemanticComponent";

import { SegundaFaseSemanticComponent } from "./SegundaFaseSemanticComponent";

import { TerceraFaseSemanticComponent } from "./TerceraFaseSemanticComponent";

import { TranspiladorComponentes } from "./TranspiladorComponentes";


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
                moduloYFera
            );
        }

        for (const hijo of moduloYFera.modulosHijos) {
            await this.validarComponentes(hijo);
        }
    }


    /*Metodo que permite analizar los bloques de componentes */
    async analizarBloqueComponente(recursoComponente, moduloYFera) {
        try {
            const tablaSimbolosComponentes = moduloYFera.tablaSimbolosComponentes;
            const tablaSimbolosEstilos = moduloYFera.tablaSimbolosEstilos;

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


            /* Primera Fase: Registrar componentes y detectar duplicados*/
            const primeraFase = new PrimeraFaseSemanticComponent(this.compilador, this.manejadorDb);

            for (const nodo of astComponentes) {
                await primeraFase.ejecutarPrimeraPasada(nodo, recursoComponente, tablaSimbolosComponentes);
            }

            /* Segunda Fase: Validar estilos referenciados*/
            const segundaFase = new SegundaFaseSemanticComponent(this.compilador, this.manejadorDb);
            for (const nodo of astComponentes) {
                await segundaFase.ejecutarSegundaPasada(nodo, recursoComponente, tablaSimbolosEstilos);
            }

            /* Tercera Fase: Validar tipos y compatibilidad */
            const terceraFase = new TerceraFaseSemanticComponent(this.compilador, this.manejadorDb);
            for (const nodo of astComponentes) {
                await terceraFase.ejecutarTerceraPasada(nodo, recursoComponente, moduloYFera);
            }

            /*Cuarta fase: Transpilacion del codigo de componentes a javaScript */
            const transpilador = new TranspiladorComponentes(this.compilador, this.manejadorDb);
            let codigoModulo = '';

            for (const nodo of astComponentes) {
                if (nodo.tipo === 'LLAMADA_FUNCION') {
                    codigoModulo += await transpilador.transpilarComponente(
                        nodo,
                        recursoComponente,
                        moduloYFera
                    );
                }
            }

            moduloYFera.recursosCompilados.compiledComponentes = codigoModulo;

        } catch (error) {
            this.compilador.agregarError(
                recursoComponente.nombreArchivo,
                recursoComponente.rutaRelativa,
                'Compilacion',
                `Error al parsear componente: ${error.message}`
            );
        }
    }
}