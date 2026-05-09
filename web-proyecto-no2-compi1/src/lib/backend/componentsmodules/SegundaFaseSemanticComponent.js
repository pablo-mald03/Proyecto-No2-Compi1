import { TablaSimbolos } from "../semanticsyfera/TablaSimbolos";

import { SimboloComponente } from "../semanticsyfera/SimboloComponente";

export class SegundaFaseSemanticComponent {

    constructor(compilador, manejadorDb) {
        this.compilador = compilador;
        this.manejadorDb = manejadorDb;
    }

    /*Metodo que permite ejecutar la segunda fase de analisis semantico*/
    async ejecutarSegundaPasada(nodo, recursoComponente, tablaSimbolosEstilos) {
        if (nodo.tipo === 'LLAMADA_FUNCION') {
            await this.validarEstilosComponente(nodo, recursoComponente, tablaSimbolosEstilos);
        }
    }

    /*Metodo que permite validar los estilos del componente con todos los elementos que tenga dentro*/
    async validarEstilosComponente(nodoComponente, recursoComponente, tablaSimbolosEstilos) {
        if (!nodoComponente.parametros) return;

        await this.recorrerCuerpoValidandoEstilos(
            nodoComponente,
            nodoComponente.id,
            recursoComponente,
            tablaSimbolosEstilos
        );
    }

    /*Metodo que recorre recursivamente todos los nodos de los elementos para ir validando estilos*/
    async recorrerCuerpoValidandoEstilos(nodo, nombreComponente, recursoComponente, tablaSimbolosEstilos) {
        if (!nodo) return;

        if (Array.isArray(nodo)) {
            for (const elemento of nodo) {
                await this.recorrerCuerpoValidandoEstilos(
                    elemento,
                    nombreComponente,
                    recursoComponente,
                    tablaSimbolosEstilos
                );
            }
            return;
        }

        if (typeof nodo !== 'object') return;

        await this.validarEstilosEnNodo(nodo, nombreComponente, recursoComponente, tablaSimbolosEstilos);

        await this.recorrerHijosNodo(nodo, nombreComponente, recursoComponente, tablaSimbolosEstilos);
    }

    /*Metodo que valida los estilos en cada nodo */
    async validarEstilosEnNodo(nodo, nombreComponente, recursoComponente, tablaSimbolosEstilos) {
        let estilosArray = null;

        if (nodo.estilos && Array.isArray(nodo.estilos)) {
            estilosArray = nodo.estilos;
        }

        if (estilosArray && estilosArray.length > 0) {
            for (const estilo of estilosArray) {
                this.validarEstiloIndividual(
                    estilo,
                    nombreComponente,
                    nodo.tipo,
                    nodo.linea || 0,
                    nodo.columna || 0,
                    recursoComponente,
                    tablaSimbolosEstilos
                );
            }
        }
    }

    /*Metodo que permite validar por individual cada estilo */
    validarEstiloIndividual(estilo, nombreComponente, tipoNodo, linea, columna, recursoComponente, tablaSimbolosEstilos) {
        let nombreEstilo = '';

        if (typeof estilo === 'string') {
            nombreEstilo = estilo;
        } else if (estilo && typeof estilo === 'object') {
            nombreEstilo = estilo.valor || estilo.nombre || estilo.id;
            if (!nombreEstilo && estilo.tipo === 'IDENTIFICADOR') {
                nombreEstilo = estilo.valor;
            }
        }

        if (!nombreEstilo) return;

        nombreEstilo = nombreEstilo.replace(/^["']|["']$/g, '');

        if (!tablaSimbolosEstilos.existeLocal(nombreEstilo)) {
            this.compilador.agregarError(
                recursoComponente.nombreArchivo,
                nombreEstilo,
                'Semantico',
                `El estilo '${nombreEstilo}' no existe. Referenciado en el componente '${nombreComponente}' (${tipoNodo})`,
                linea,
                columna
            );
        }
    }

    /*Metodo que recorre los nodos hijos */
    async recorrerHijosNodo(nodo, nombreComponente, recursoComponente, tablaSimbolosEstilos) {
        if (!nodo) return;

        switch (nodo.tipo) {
            case 'LLAMADA_FUNCION':
                if (nodo.cuerpo) {
                    await this.recorrerCuerpoValidandoEstilos(
                        nodo.cuerpo,
                        nombreComponente,
                        recursoComponente,
                        tablaSimbolosEstilos
                    );
                }

                for (const key in nodo) {
                    if (key !== 'tipo' && key !== 'id' && key !== 'parametros' &&
                        key !== 'cuerpo' && key !== 'linea' && key !== 'columna' &&
                        typeof nodo[key] === 'object') {
                        await this.recorrerCuerpoValidandoEstilos(
                            nodo[key],
                            nombreComponente,
                            recursoComponente,
                            tablaSimbolosEstilos
                        );
                    }
                }
                break;

            case 'SECCION':
                if (nodo.contenido) {
                    await this.recorrerCuerpoValidandoEstilos(
                        nodo.contenido, nombreComponente, recursoComponente, tablaSimbolosEstilos
                    );
                }
                break;

            case 'TABLA':
                if (nodo.filas) {
                    await this.recorrerCuerpoValidandoEstilos(
                        nodo.filas, nombreComponente, recursoComponente, tablaSimbolosEstilos
                    );
                }
                break;

            case 'FILA':
                if (nodo.celdas) {
                    await this.recorrerCuerpoValidandoEstilos(
                        nodo.celdas, nombreComponente, recursoComponente, tablaSimbolosEstilos
                    );
                }
                break;

            case 'CELDA':
                if (nodo.contenido) {
                    await this.recorrerCuerpoValidandoEstilos(
                        nodo.contenido, nombreComponente, recursoComponente, tablaSimbolosEstilos
                    );
                }
                break;

            case 'FORMULARIO':
                if (nodo.contenido) {
                    await this.recorrerCuerpoValidandoEstilos(
                        nodo.contenido, nombreComponente, recursoComponente, tablaSimbolosEstilos
                    );
                }
                if (nodo.submit) {
                    await this.recorrerCuerpoValidandoEstilos(
                        nodo.submit, nombreComponente, recursoComponente, tablaSimbolosEstilos
                    );
                }
                break;

            case 'SUBMIT':
                break;

            case 'COMPONENTE_TEXTO':
            case 'COMPONENTE_IMG':
            case 'INPUT_TEXT':
            case 'INPUT_NUMBER':
            case 'INPUT_BOOL':
                break;

            case 'FOR_EACH':
                if (nodo.cuerpo) {
                    await this.recorrerCuerpoValidandoEstilos(
                        nodo.cuerpo, nombreComponente, recursoComponente, tablaSimbolosEstilos
                    );
                }
                if (nodo.empty && nodo.empty.cuerpo) {
                    await this.recorrerCuerpoValidandoEstilos(
                        nodo.empty.cuerpo, nombreComponente, recursoComponente, tablaSimbolosEstilos
                    );
                }
                break;

            case 'FOR_COMPLEJO':
                if (nodo.cuerpo) {
                    await this.recorrerCuerpoValidandoEstilos(
                        nodo.cuerpo, nombreComponente, recursoComponente, tablaSimbolosEstilos
                    );
                }
                if (nodo.empty && nodo.empty.cuerpo) {
                    await this.recorrerCuerpoValidandoEstilos(
                        nodo.empty.cuerpo, nombreComponente, recursoComponente, tablaSimbolosEstilos
                    );
                }
                break;

            case 'ESTRUCTURA_IF':
                if (nodo.cuerpo) {
                    await this.recorrerCuerpoValidandoEstilos(
                        nodo.cuerpo, nombreComponente, recursoComponente, tablaSimbolosEstilos
                    );
                }
                if (nodo.continuacion) {
                    await this.recorrerCuerpoValidandoEstilos(
                        nodo.continuacion, nombreComponente, recursoComponente, tablaSimbolosEstilos
                    );
                }
                break;

            case 'ELSE_IF':
            case 'ELSE_FINAL':
                if (nodo.cuerpo) {
                    await this.recorrerCuerpoValidandoEstilos(
                        nodo.cuerpo, nombreComponente, recursoComponente, tablaSimbolosEstilos
                    );
                }
                if (nodo.continuacion) {
                    await this.recorrerCuerpoValidandoEstilos(
                        nodo.continuacion, nombreComponente, recursoComponente, tablaSimbolosEstilos
                    );
                }
                break;

            case 'ESTRUCTURA_SWITCH':
                if (nodo.casos) {
                    await this.recorrerCuerpoValidandoEstilos(
                        nodo.casos, nombreComponente, recursoComponente, tablaSimbolosEstilos
                    );
                }
                break;

            case 'CASO_SWITCH':
            case 'DEFAULT_SWITCH':
                if (nodo.cuerpo) {
                    await this.recorrerCuerpoValidandoEstilos(
                        nodo.cuerpo, nombreComponente, recursoComponente, tablaSimbolosEstilos
                    );
                }
                break;

            default:
                if (nodo.tipo && !nodo.tipo.startsWith('VALOR_') && nodo.tipo !== 'VARIABLE') {
                    for (const key in nodo) {
                        if (key !== 'tipo' && key !== 'linea' && key !== 'columna' &&
                            key !== 'id' && key !== 'parametros' && typeof nodo[key] === 'object') {
                            await this.recorrerCuerpoValidandoEstilos(
                                nodo[key],
                                nombreComponente,
                                recursoComponente,
                                tablaSimbolosEstilos
                            );
                        }
                    }
                }
                break;
        }
    }

}