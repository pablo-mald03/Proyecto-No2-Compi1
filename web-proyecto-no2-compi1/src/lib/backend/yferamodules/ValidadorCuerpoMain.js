import { TablaSimbolos } from "../semanticsyfera/TablaSimbolos";

/*Clase delegada para la cuarta fase: Validacion semantica del cuerpo main y llamadas */
export class ValidadorCuerpoMain {

    constructor(compilador, manejadorDb) {
        this.compilador = compilador;
        this.manejadorDb = manejadorDb;
    }

    /*Metodo principal que valida recursivamente el arbol de ejecucion */
    async validarCuerpoMain(moduloYfera) {
        if (!moduloYfera || !moduloYfera.ast) return;

        const nodoMain = moduloYfera.ast.find(nodo => nodo.tipo === 'FUNCION_MAIN');

        if (!nodoMain) {
            return;
        }

        await this.validarBloqueInstrucciones(
            nodoMain.cuerpo,
            moduloYfera.tablaSimbolos,
            moduloYfera.tablaSimbolosComponentes,
            moduloYfera.nombre
        );

        for (const moduloHijo of moduloYfera.modulosHijos) {
            await this.validarCuerpoMain(moduloHijo);
        }
    }

    /*Metodo que valida un bloque de instrucciones recursivamente */
    async validarBloqueInstrucciones(instrucciones, tablaSimbolos, tablaComponentes, nombreArchivo) {
        if (!instrucciones || !Array.isArray(instrucciones)) return;

        for (const instruccion of instrucciones) {
            if (!instruccion) continue;

            switch (instruccion.tipo) {
                case 'LLAMADA_COMPONENTE':
                    await this.validarLlamadaComponente(instruccion, tablaComponentes, tablaSimbolos, nombreArchivo);
                    break;

                case 'ESTRUCTURA_IF':
                    await this.validarBloqueInstrucciones(
                        instruccion.instrucciones_true,
                        tablaSimbolos,
                        tablaComponentes,
                        nombreArchivo
                    );
                    if (instruccion.instrucciones_false) {
                        const falseBranch = Array.isArray(instruccion.instrucciones_false)
                            ? instruccion.instrucciones_false
                            : [instruccion.instrucciones_false];
                        await this.validarBloqueInstrucciones(
                            falseBranch,
                            tablaSimbolos,
                            tablaComponentes,
                            nombreArchivo
                        );
                    }
                    break;

                case 'CICLO_WHILE':
                case 'CICLO_DO_WHILE':
                    await this.validarBloqueInstrucciones(
                        instruccion.cuerpo,
                        tablaSimbolos,
                        tablaComponentes,
                        nombreArchivo
                    );
                    break;

                case 'CICLO_FOR':
                    await this.validarBloqueInstrucciones(
                        instruccion.cuerpo,
                        tablaSimbolos,
                        tablaComponentes,
                        nombreArchivo
                    );
                    break;

                case 'ESTRUCTURA_SWITCH':
                    if (instruccion.casos && Array.isArray(instruccion.casos)) {
                        for (const caso of instruccion.casos) {
                            if (caso.instrucciones) {
                                await this.validarBloqueInstrucciones(
                                    caso.instrucciones,
                                    tablaSimbolos,
                                    tablaComponentes,
                                    nombreArchivo
                                );
                            }
                        }
                    }
                    break;

                case 'ASIGNACION':
                case 'ASIGNACION_ARREGLO':
                    const variable = tablaSimbolos.getVariable(instruccion.id);
                    if (!variable) {
                        this.compilador.agregarError(
                            nombreArchivo,
                            instruccion.id,
                            'Semantico',
                            `Variable '${instruccion.id}' no definida.`,
                            instruccion.linea,
                            instruccion.columna
                        );
                    }
                    break;

                case 'BREAK':
                case 'CONTINUE':
                    break;

                default:
                    break;
            }
        }
    }

    /*Metodo que obtiene informacion completa de un argumento */
    obtenerInfoArgumento(nodo, tablaSimbolos) {
        if (!nodo) return null;

        switch (nodo.tipo) {
            case 'INT':
                return { tipoBase: 'ENTERA', esArreglo: false };
            case 'FLOAT':
                return { tipoBase: 'FLOAT', esArreglo: false };
            case 'VALOR_CADENA':
                return { tipoBase: 'CADENA', esArreglo: false };
            case 'CHAR':
                return { tipoBase: 'CARACTER', esArreglo: false };
            case 'BOOL':
                return { tipoBase: 'BOOLEANA', esArreglo: false };

            case 'ACCESO_ARREGLO':

                const simboloArr = tablaSimbolos.getVariable(nodo.valor || nodo.id);
                if (!simboloArr) {
                    return { tipoBase: 'VARIABLE', esArreglo: false };
                }
                return {
                    tipoBase: simboloArr.tipoDato,
                    esArreglo: false
                };

            case 'ID':
                const simbolo = tablaSimbolos.getVariable(nodo.valor);
                if (!simbolo) {
                    return { tipoBase: 'VARIABLE', esArreglo: false };
                }

                if (simbolo.tipoDato === 'FUNCTION') {
                    return { tipoBase: 'FUNCTION', esArreglo: false };
                }

                return {
                    tipoBase: simbolo.tipoDato,
                    esArreglo: simbolo.esArreglo
                };

            default:
                return null;
        }
    }

    /*Metodo que valida una llamada a componente */
    async validarLlamadaComponente(nodo, tablaComponentes, tablaSimbolos, nombreArchivo) {
        const nombreComponente = nodo.nombre;

        const simboloComponente = tablaComponentes.getVariable(nombreComponente);

        if (!simboloComponente) {
            this.compilador.agregarError(
                nombreArchivo,
                nombreComponente,
                'Semantico',
                `El componente '${nombreComponente}' no ha sido definido.`,
                nodo.linea,
                nodo.columna
            );
            return;
        }

        const parametrosEsperados = simboloComponente.parametros || [];
        const argumentosRecibidos = nodo.argumentos || [];

        if (argumentosRecibidos.length !== parametrosEsperados.length) {
            this.compilador.agregarError(
                nombreArchivo,
                nombreComponente,
                'Semantico',
                `El componente '${nombreComponente}' espera ${parametrosEsperados.length} parámetros, ` +
                `pero se enviaron ${argumentosRecibidos.length}.`,
                nodo.linea,
                nodo.columna
            );
            return;
        }

        for (let i = 0; i < parametrosEsperados.length; i++) {
            const paramEsperado = parametrosEsperados[i];
            const argRecibido = argumentosRecibidos[i];

            if (!argRecibido || !argRecibido.tipo) continue;

            const infoArg = this.obtenerInfoArgumento(argRecibido, tablaSimbolos);

            if (!infoArg) continue;

            if (infoArg.tipoBase === 'VARIABLE') continue;

            if (!this.sonTiposCompatibles(paramEsperado.tipo, infoArg.tipoBase)) {
                this.compilador.agregarError(
                    nombreArchivo,
                    nombreComponente,
                    'Semantico',
                    `Parámetro '${paramEsperado.nombre}' (${i + 1}) espera tipo ${paramEsperado.tipo}, ` +
                    `pero se envió tipo ${infoArg.tipoBase}.`,
                    nodo.linea,
                    nodo.columna
                );
            }

            if (paramEsperado.esArreglo && !infoArg.esArreglo) {
                this.compilador.agregarError(
                    nombreArchivo,
                    nombreComponente,
                    'Semantico',
                    `Parámetro '${paramEsperado.nombre}' (${i + 1}) espera un arreglo, ` +
                    `pero se envió un valor simple.`,
                    nodo.linea,
                    nodo.columna
                );
            }

            if (!paramEsperado.esArreglo && infoArg.esArreglo) {
                this.compilador.agregarError(
                    nombreArchivo,
                    nombreComponente,
                    'Semantico',
                    `Parámetro '${paramEsperado.nombre}' (${i + 1}) no espera un arreglo, ` +
                    `pero se envió el arreglo completo. ¿Quizás quisiste usar un índice?`,
                    nodo.linea,
                    nodo.columna
                );
            }
        }
    }

    /*Metodo que compara tipos compatibles */
    sonTiposCompatibles(tipoDestino, tipoValor) {
        if (tipoDestino === tipoValor) return true;

        if (tipoDestino === 'FUNCTION' && tipoValor === 'FUNCTION') return true;

        if (tipoDestino === 'FLOAT' && tipoValor === 'ENTERA') return true;
        if (tipoDestino === 'ENTERA' && tipoValor === 'CARACTER') return true;
        if (tipoDestino === 'CARACTER' && tipoValor === 'ENTERA') return true;
        if (tipoDestino === 'ENTERA' && tipoValor === 'BOOLEANA') return true;

        if (tipoDestino === 'ARREGLO' && tipoValor === 'ARREGLO') return true;

        return false;
    }
}