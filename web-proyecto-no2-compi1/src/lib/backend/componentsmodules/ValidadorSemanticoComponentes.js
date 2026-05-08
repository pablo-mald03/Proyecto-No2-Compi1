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
            for (const nodo of astComponentes) {
                await this.ejecutarPrimeraPasada(nodo, recursoComponente, tablaSimbolosComponentes);
            }

            /* Segunda Fase: Validar estilos referenciados*/
            for (const nodo of astComponentes) {
                await this.ejecutarSegundaPasada(nodo, recursoComponente, tablaSimbolosEstilos);
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

            case 'COMPONENTE_PERSONALIZADO':
                if (nodo.argumentos && Array.isArray(nodo.argumentos)) {
                    for (const arg of nodo.argumentos) {
                        await this.recorrerCuerpoValidandoEstilos(
                            arg, nombreComponente, recursoComponente, tablaSimbolosEstilos
                        );
                    }
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