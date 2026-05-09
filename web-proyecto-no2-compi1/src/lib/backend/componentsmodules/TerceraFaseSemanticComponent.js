import { TablaSimbolos } from "../semanticsyfera/TablaSimbolos";

import { SimboloComponente } from "../semanticsyfera/SimboloComponente";

/*Clase delegada para poder realizar la tercera fase de analisis semantico de los componentes */
export class TerceraFaseSemanticComponent {

    constructor(compilador, manejadorDb) {
        this.compilador = compilador;
        this.manejadorDb = manejadorDb;
    }
    /* Metodo principal para ejecutar la tercera fase */
    async ejecutarTerceraPasada(nodo, recursoComponente, moduloYFera) {
        if (nodo.tipo === 'LLAMADA_FUNCION') {
            await this.validarTiposComponente(nodo, recursoComponente, moduloYFera);
        }
    }

    /* Metodo que valida los tipos de variables dentro de un componente */
    async validarTiposComponente(nodoComponente, recursoComponente, moduloYFera) {
        if (!nodoComponente.parametros) return;

        const tablaLocal = new TablaSimbolos(moduloYFera.tablaSimbolosComponentes);

        const parametros = this.extraerParametros(nodoComponente.parametros);
        for (const param of parametros) {
            const simboloParam = {
                id: param.nombre,
                tipoDato: param.tipo,
                esArreglo: param.esArreglo,
                linea: nodoComponente.linea,
                columna: nodoComponente.columna
            };
            tablaLocal.insertar(param.nombre, simboloParam);
        }

        if (nodoComponente.cuerpo) {
            await this.validarTiposEnNodo(
                nodoComponente.cuerpo,
                recursoComponente,
                tablaLocal,
                nodoComponente.id
            );
        }
    }

    /* Metodo que permite validar tipos recursivamente en el AST */
    async validarTiposEnNodo(nodo, recursoComponente, tablaSimbolos, nombreComponente) {
        if (!nodo) return;

        if (Array.isArray(nodo)) {
            for (const elemento of nodo) {
                await this.validarTiposEnNodo(elemento, recursoComponente, tablaSimbolos, nombreComponente);
            }
            return;
        }

        if (typeof nodo !== 'object') return;

        switch (nodo.tipo) {
            case 'FOR_EACH':
                await this.validarForEach(nodo, recursoComponente, tablaSimbolos, nombreComponente);
                return;

            case 'FOR_COMPLEJO':
                await this.validarForComplejo(nodo, recursoComponente, tablaSimbolos, nombreComponente);
                return;

            case 'COMPONENTE_PERSONALIZADO':
                await this.validarInvocacionComponente(nodo, recursoComponente, tablaSimbolos, nombreComponente);
                break;

            case 'OPERACION':
                await this.validarOperacion(nodo, recursoComponente, tablaSimbolos, nombreComponente);
                break;

            case 'OPERACION_UNARIA':
                await this.validarOperacionUnaria(nodo, recursoComponente, tablaSimbolos, nombreComponente);
                break;

            case 'VARIABLE':
                await this.validarVariable(nodo, recursoComponente, tablaSimbolos, nombreComponente);
                break;

            case 'ACCESO_ARREGLO':
                await this.validarAccesoArreglo(nodo, recursoComponente, tablaSimbolos, nombreComponente);
                break;

            case 'LLAMADA_FUNCION_VAR':
                await this.validarLlamadaFuncionVar(nodo, recursoComponente, tablaSimbolos, nombreComponente);
                break;

            case 'CADENA_INTERPOLADA':
                await this.validarCadenaInterpolada(nodo, recursoComponente, tablaSimbolos, nombreComponente);
                break;
        }

        await this.validarTiposEnHijos(nodo, recursoComponente, tablaSimbolos, nombreComponente);
    }


    /* Metodo que valida la invocacion de un componente personalizado */
    async validarInvocacionComponente(nodo, recursoComponente, tablaSimbolos, nombreComponentePadre) {
        const nombreComponente = nodo.id;

        let componenteDef = tablaSimbolos.obtener(nombreComponente);

        if (!componenteDef) {
            let tablaActual = tablaSimbolos;
            while (tablaActual.padre) {
                tablaActual = tablaActual.padre;
                componenteDef = tablaActual.obtener(nombreComponente);
                if (componenteDef) break;
            }
        }

        if (!componenteDef) {
            this.compilador.agregarError(
                recursoComponente.nombreArchivo,
                nombreComponente,
                'Semantico',
                `El componente '${nombreComponente}' no esta declarado. Invocado desde '${nombreComponentePadre}'`,
                nodo.linea,
                nodo.columna
            );
            return;
        }

        const esperados = componenteDef.parametros || [];
        const recibidos = nodo.argumentos || [];

        if (esperados.length !== recibidos.length) {
            this.compilador.agregarError(
                recursoComponente.nombreArchivo,
                nombreComponente,
                'Semantico',
                `El componente '${nombreComponente}' espera ${esperados.length} parametros pero recibe ${recibidos.length}. ` +
                `Definido en ${componenteDef.valor.archivoOrigen} linea ${componenteDef.linea}`,
                nodo.linea,
                nodo.columna
            );
            return;
        }

        for (let i = 0; i < esperados.length; i++) {
            const paramEsperado = esperados[i];
            const argumento = recibidos[i];

            const tipoArgumento = await this.inferirTipoExpresion(argumento, tablaSimbolos);

            if (!this.sonTiposCompartibles(paramEsperado.tipo, tipoArgumento, paramEsperado.esArreglo)) {
                this.compilador.agregarError(
                    recursoComponente.nombreArchivo,
                    nombreComponente,
                    'Semantico',
                    `Error de tipo en componente '${nombreComponente}': parametro '${paramEsperado.nombre}' ` +
                    `espera tipo '${paramEsperado.tipo}'${paramEsperado.esArreglo ? '[]' : ''} pero recibio: '${tipoArgumento}'`,
                    nodo.linea,
                    nodo.columna
                );
            }
        }
    }

    /* Metodo que permite inferir los tipos de la expresion planteada */
    async inferirTipoExpresion(expresion, tablaSimbolos) {
        if (!expresion) return 'DESCONOCIDO';

        switch (expresion.tipo) {
            case 'VALOR':
                if (typeof expresion.valor === 'number') {
                    return Number.isInteger(expresion.valor) ? 'ENTERA' : 'FLOAT';
                }
                return 'DESCONOCIDO';

            case 'VALOR_TRUE':
            case 'VALOR_FALSE':
                return 'BOOLEANA';

            case 'CADENA_INTERPOLADA':
            case 'TEXTO_PLANO':
                return 'CADENA';

            case 'VARIABLE':
                const variable = tablaSimbolos.obtener(expresion.nombre);
                if (!variable) return 'DESCONOCIDO';

                if (variable.esArreglo) {
                    return variable.tipoDato;
                }

                return variable.tipoDato;

            case 'ACCESO_ARREGLO':
                const arreglo = tablaSimbolos.obtener(expresion.nombre);
                return arreglo && arreglo.esArreglo ? arreglo.tipoDato : 'DESCONOCIDO';

            case 'OPERACION':
                const tipoIzq = await this.inferirTipoExpresion(expresion.izq, tablaSimbolos);
                const tipoDer = await this.inferirTipoExpresion(expresion.der, tablaSimbolos);

                switch (expresion.operador) {
                    case 'SUMA':
                        if (tipoIzq === 'CADENA' || tipoDer === 'CADENA') return 'CADENA';
                        if ((tipoIzq === 'ENTERA' || tipoIzq === 'FLOAT') &&
                            (tipoDer === 'ENTERA' || tipoDer === 'FLOAT')) return tipoIzq;
                        return 'DESCONOCIDO';

                    case 'RESTA':
                    case 'MULTIPLICACION':
                    case 'DIVISION':
                    case 'MODULO':
                        return (tipoIzq === 'ENTERA' || tipoIzq === 'FLOAT') &&
                            (tipoDer === 'ENTERA' || tipoDer === 'FLOAT') ? tipoIzq : 'DESCONOCIDO';

                    case 'MAYOR':
                    case 'MENOR':
                    case 'MAYOR_IGUAL':
                    case 'MENOR_IGUAL':
                    case 'IGUALACION':
                    case 'DIFERENCIA':
                        return 'BOOLEANA';

                    case 'AND':
                    case 'OR':
                        return (tipoIzq === 'BOOLEANA' && tipoDer === 'BOOLEANA') ? 'BOOLEANA' : 'DESCONOCIDO';

                    default:
                        return 'DESCONOCIDO';
                }

            case 'OPERACION_UNARIA':
                const tipoValor = await this.inferirTipoExpresion(expresion.valor, tablaSimbolos);
                if (expresion.operador === 'NOT') {
                    return tipoValor === 'BOOLEANA' ? 'BOOLEANA' : 'DESCONOCIDO';
                }
                return tipoValor === 'ENTERA' || tipoValor === 'FLOAT' ? tipoValor : 'DESCONOCIDO';

            case 'LLAMADA_FUNCION_VAR':
                return 'FUNCTION';

            default:
                return 'DESCONOCIDO';
        }
    }

    /* Metodo que valida que una variable exista en el ambito e incluso arreglos */
    async validarVariable(nodo, recursoComponente, tablaSimbolos, nombreComponente) {
        const simbolo = tablaSimbolos.obtener(nodo.nombre);

        if (!simbolo) {
            this.compilador.agregarError(
                recursoComponente.nombreArchivo,
                nodo.nombre,
                'Semantico',
                `Variable '${nodo.nombre}' no definida en el componente '${nombreComponente}'`,
                nodo.loc_linea || nodo.linea,
                nodo.loc_columna || nodo.columna
            );
            return;
        }

    }

    /* Metodo que permite validar las operaciones */
    async validarOperacion(nodo, recursoComponente, tablaSimbolos, nombreComponente) {
        const tipoIzq = await this.inferirTipoExpresion(nodo.izq, tablaSimbolos);
        const tipoDer = await this.inferirTipoExpresion(nodo.der, tablaSimbolos);

        let esValido = false;

        switch (nodo.operador) {
            case 'SUMA':
                esValido = (tipoIzq === 'CADENA' || tipoDer === 'CADENA') ||
                    ((tipoIzq === 'ENTERA' || tipoIzq === 'FLOAT') &&
                        (tipoDer === 'ENTERA' || tipoDer === 'FLOAT'));
                break;

            case 'RESTA':
            case 'MULTIPLICACION':
            case 'DIVISION':
            case 'MODULO':
                esValido = (tipoIzq === 'ENTERA' || tipoIzq === 'FLOAT') &&
                    (tipoDer === 'ENTERA' || tipoDer === 'FLOAT');
                break;

            case 'MAYOR':
            case 'MENOR':
            case 'MAYOR_IGUAL':
            case 'MENOR_IGUAL':
            case 'IGUALACION':
            case 'DIFERENCIA':
                esValido = (tipoIzq !== 'DESCONOCIDO' && tipoDer !== 'DESCONOCIDO');
                break;

            case 'AND':
            case 'OR':
                esValido = (tipoIzq === 'BOOLEANA' && tipoDer === 'BOOLEANA');
                break;

            default:
                esValido = false;
        }

        if (!esValido) {
            this.compilador.agregarError(
                recursoComponente.nombreArchivo,
                nodo.operador,
                'Semantico',
                `Operación '${nodo.operador}' incompatible entre tipos '${tipoIzq}' y '${tipoDer}' en componente '${nombreComponente}'`,
                nodo.loc_linea || nodo.linea,
                nodo.loc_columna || nodo.columna
            );
        }
    }

    /* Metodo que permite validar una operacion unaria */
    async validarOperacionUnaria(nodo, recursoComponente, tablaSimbolos, nombreComponente) {
        const tipoValor = await this.inferirTipoExpresion(nodo.valor, tablaSimbolos);
        let esValido = false;

        if (nodo.operador === 'NOT') {
            esValido = (tipoValor === 'BOOLEANA');
        } else if (nodo.operador === 'MENOS_UNARIO') {
            esValido = (tipoValor === 'ENTERA' || tipoValor === 'FLOAT');
        }

        if (!esValido) {
            this.compilador.agregarError(
                recursoComponente.nombreArchivo,
                nodo.operador,
                'Semantico',
                `Operador unario '${nodo.operador}' no aplicable a tipo '${tipoValor}' en componente '${nombreComponente}'`,
                nodo.loc_linea || nodo.linea,
                nodo.loc_columna || nodo.columna
            );
        }
    }


    /* Metodo que permite validar acceso a un arreglo */
    async validarAccesoArreglo(nodo, recursoComponente, tablaSimbolos, nombreComponente) {
        const arreglo = tablaSimbolos.obtener(nodo.nombre);

        if (!arreglo) {
            this.compilador.agregarError(
                recursoComponente.nombreArchivo,
                nodo.nombre,
                'Semantico',
                `Arreglo '${nodo.nombre}' no definido en componente '${nombreComponente}'`,
                nodo.loc_linea || nodo.linea,
                nodo.loc_columna || nodo.columna
            );
            return;
        }

        if (!arreglo.esArreglo) {
            this.compilador.agregarError(
                recursoComponente.nombreArchivo,
                nodo.nombre,
                'Semantico',
                `'${nodo.nombre}' no es un arreglo en el componente '${nombreComponente}'`,
                nodo.loc_linea || nodo.linea,
                nodo.loc_columna || nodo.columna
            );
        }

        const tipoIndice = await this.inferirTipoExpresion(nodo.indice, tablaSimbolos);
        if (tipoIndice !== 'ENTERA') {
            this.compilador.agregarError(
                recursoComponente.nombreArchivo,
                '',
                'Semantico',
                `El indice de arreglo debe ser numerico para su llamada en el componente '${nombreComponente}'`,
                nodo.loc_linea || nodo.linea,
                nodo.loc_columna || nodo.columna
            );
        }
    }

    /* Valida llamada a función almacenada en variable */
    async validarLlamadaFuncionVar(nodo, recursoComponente, tablaSimbolos, nombreComponente) {
        const funcionVar = tablaSimbolos.obtener(nodo.nombre);

        if (!funcionVar) {
            this.compilador.agregarError(
                recursoComponente.nombreArchivo,
                nodo.nombre,
                'Semantico',
                `Variable '${nodo.nombre}' no esta definida para llamada de funcion en componente '${nombreComponente}'`,
                nodo.loc_linea || nodo.linea,
                nodo.loc_columna || nodo.columna
            );
            return;
        }

        if (funcionVar.tipoDato !== 'FUNCTION') {
            this.compilador.agregarError(
                recursoComponente.nombreArchivo,
                nodo.nombre,
                'Semantico',
                `'${nodo.nombre}' no es una funcion. No se puede invocar en componente '${nombreComponente}'`,
                nodo.loc_linea || nodo.linea,
                nodo.loc_columna || nodo.columna
            );
        }
    }

    /* Valida cadena interpolada con caracteres dentro*/
    async validarCadenaInterpolada(nodo, recursoComponente, tablaSimbolos, nombreComponente) {
        if (nodo.fragmentos && Array.isArray(nodo.fragmentos)) {
            for (const fragmento of nodo.fragmentos) {
                if (fragmento.tipo === 'VARIABLE') {
                    await this.validarVariable(fragmento, recursoComponente, tablaSimbolos, nombreComponente);
                } else if (fragmento.tipo === 'EXPRESION_INTERPOLADA' && fragmento.expresion) {
                    await this.validarTiposEnNodo(fragmento.expresion, recursoComponente, tablaSimbolos, nombreComponente);
                }
            }
        }
    }

    /* Metodo recursivo que permite ir validando en todos los hijos los tipos */
    async validarTiposEnHijos(nodo, recursoComponente, tablaSimbolos, nombreComponente) {
        const propiedadesHijo = ['contenido', 'cuerpo', 'parametros', 'argumentos', 'valor', 'izq', 'der', 'valor_comparacion', 'casos', 'filas', 'celdas', 'condicion', 'continuacion', 'evaluacion'];

        for (const prop of propiedadesHijo) {
            if (nodo[prop]) {
                if (Array.isArray(nodo[prop])) {
                    for (const item of nodo[prop]) {
                        await this.validarTiposEnNodo(item, recursoComponente, tablaSimbolos, nombreComponente);
                    }
                } else if (typeof nodo[prop] === 'object') {
                    await this.validarTiposEnNodo(nodo[prop], recursoComponente, tablaSimbolos, nombreComponente);
                }
            }
        }
    }

    /* Metodo auxiliar que verifica compatibilidad entre tipos */
    sonTiposCompartibles(tipoEsperado, tipoRecibido, esArregloEsperado = false) {
        if (esArregloEsperado) {
            return tipoRecibido === 'DESCONOCIDO' || tipoRecibido === tipoEsperado;
        }

        if (tipoEsperado === 'ENTERA' && tipoRecibido === 'FLOAT') return true;
        if (tipoEsperado === 'FLOAT' && tipoRecibido === 'ENTERA') return true;

        return tipoEsperado === tipoRecibido || tipoRecibido === 'DESCONOCIDO';
    }


    /* Metodo que permite validar FOR_EACH con su propio ambito */
    async validarForEach(nodo, recursoComponente, tablaSimbolos, nombreComponente) {
        const ambitoCiclo = new TablaSimbolos(tablaSimbolos);

        const nombreArreglo = nodo.arreglo;
        const nombreIterador = nodo.iterador;

        const arregloSimbolo = tablaSimbolos.obtener(nombreArreglo);

        if (!arregloSimbolo) {
            this.compilador.agregarError(
                recursoComponente.nombreArchivo,
                nodo.arreglo,
                'Semantico',
                `Arreglo '${nodo.arreglo}' no definido para iterar en componente '${nombreComponente}'. Arreglos disponibles: ${Array.from(tablaSimbolos.variables.keys()).join(', ')}`,
                nodo.linea,
                nodo.columna
            );
            return;
        }

        if (!arregloSimbolo.esArreglo) {
            this.compilador.agregarError(
                recursoComponente.nombreArchivo,
                nodo.arreglo,
                'Semantico',
                `'${nodo.arreglo}' no es un arreglo, no se puede iterar en componente '${nombreComponente}'`,
                nodo.linea,
                nodo.columna
            );
            return;
        }

        const iteradorSimbolo = {
            id: nombreIterador,
            tipoDato: arregloSimbolo.tipoDato,
            esArreglo: false,
            linea: nodo.linea,
            columna: nodo.columna
        };
        ambitoCiclo.insertar(nombreIterador, iteradorSimbolo);

        if (nodo.cuerpo) {
            await this.validarTiposEnNodo(nodo.cuerpo, recursoComponente, ambitoCiclo, nombreComponente);
        }

        if (nodo.empty && nodo.empty.cuerpo) {
            await this.validarTiposEnNodo(nodo.empty.cuerpo, recursoComponente, ambitoCiclo, nombreComponente);
        }
    }

    /* Metodo que permite validar FOR_COMPLEJO con sus propios ambitos */
    async validarForComplejo(nodo, recursoComponente, tablaSimbolos, nombreComponente) {
        const ambitoCiclo = new TablaSimbolos(tablaSimbolos);

        if (nodo.iteradores && Array.isArray(nodo.iteradores)) {
            for (const iter of nodo.iteradores) {
                const arregloSimbolo = tablaSimbolos.obtener(iter.arreglo);

                if (!arregloSimbolo) {
                    this.compilador.agregarError(
                        recursoComponente.nombreArchivo,
                        iter.arreglo,
                        'Semantico',
                        `Arreglo '${iter.arreglo}' no definido para iterar en componente '${nombreComponente}'`,
                        nodo.linea,
                        nodo.columna
                    );
                    continue;
                }

                if (!arregloSimbolo.esArreglo) {
                    this.compilador.agregarError(
                        recursoComponente.nombreArchivo,
                        iter.arreglo,
                        'Semantico',
                        `'${iter.arreglo}' no es un arreglo, no se puede iterar en componente '${nombreComponente}'`,
                        nodo.linea,
                        nodo.columna
                    );
                    continue;
                }

                const iteradorSimbolo = {
                    id: iter.iterador,
                    tipoDato: arregloSimbolo.tipoDato,
                    esArreglo: false,
                    linea: nodo.linea,
                    columna: nodo.columna
                };
                ambitoCiclo.insertar(iter.iterador, iteradorSimbolo);
            }
        }

        if (nodo.cuerpo) {
            await this.validarTiposEnNodo(nodo.cuerpo, recursoComponente, ambitoCiclo, nombreComponente);
        }
        if (nodo.empty && nodo.empty.cuerpo) {
            await this.validarTiposEnNodo(nodo.empty.cuerpo, recursoComponente, ambitoCiclo, nombreComponente);
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