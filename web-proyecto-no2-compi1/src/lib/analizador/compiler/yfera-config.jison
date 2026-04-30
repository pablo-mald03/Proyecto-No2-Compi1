/* Seccion analizador Lexico */

%lex
%options ranges yylineno

/*------***---Estado de strings---***------*/
%x string

%x backstring

%%

/*Espacios y saltos de linea*/

\s+                   /* ignorar espacios */

[\u200B\uFEFF\u200E\u200F\u202A-\u202E]+ /* Ignorar caracteres basura */

/*Apartado de comentarios*/

"#".*           /*Ignorar comentario de linea*/

"/*"([^*]|\*+[^*/])*(\*+"/")           /*Ignorar comentario multilinea*/

/*------***---Reconocimiento del ID especial de main---***------*/

"main"                          return 'MAIN';

/*------***---Reconocimiento de tipos de variables---***------*/

"int"                           return 'INT';

"float"                         return 'FLOAT';

"string"                        return 'STRING';

"boolean"                       return 'BOOLEAN';

"char"                          return 'CHAR';

"function"                          return 'FUNCTION';

/*------***---Reconocimiento de palabras reservadas de valores de variables---***------*/

"True"                          return 'TRUE';

"False"                         return 'FALSE';


/*------***---Reconocimiento de caracteres especiales del lenguaje---***------*/

","                         return 'COMA';

";"                         return 'PUNTO_COMA';

":"                         return 'DOS_PUNTOS';

"{"                         return 'LLAVE_APERTURA';

"}"                         return 'LLAVE_CIERRE';

"("                         return 'PARENT_APERTURA';

")"                         return 'PARENT_CIERRE';

"["                         return 'CORCHETE_APERTURA';

"]"                         return 'CORCHETE_CIERRE';


/*------***---Reconocimiento de palabras reservadas de estructuras de control---***------*/

"while"                         return 'WHILE';

"for"                           return 'FOR';

"if"                            return 'IF';

"else"                          return 'ELSE';

"switch"                        return 'SWITCH';

"case"                          return 'CASE';

"break"                         return 'BREAK';

"continue"                      return 'CONTINUE';

"default"                       return 'DEFAULT';

"do"                            return 'DO';

/*------***---Reconocimiento de operadores aritmeticos---***------*/

"+"                     return 'MAS';

"-"                     return 'MENOS';

"*"                     return 'MULTIPLICACION';

"/"                     return 'DIVISION';

"%"                     return 'MODULO';


/*------***---Reconocimiento de operadores de comparacion---***------*/

">="                        return 'MAYOR_IGUAL';

"<="                        return 'MENOR_IGUAL';

">"                         return 'MAYOR';

"<"                         return 'MENOR';

"=="                        return 'IGUALACION';

"!="                        return 'DIFERENTE';


/*------***---Reconocimiento de operadores logicos---***------*/

"||"                            return 'OR';

"&&"                            return 'AND';

"!"                             return 'NOT';


/*------***---Reconocimiento de igualacion---***------*/

"="                             return 'IGUAL';

/*------***---Reconocimiento de palabras con contexto especial del lenguaje---***------*/

"import"                            return 'IMPORT';

"execute"                           return 'EXECUTE';

"load"                              return 'LOAD';


/*------***---Reconocimiento de valores de variables---***------*/

[0-9]+"."[0-9]+\b               return 'DECIMAL';

[0-9]+\b                        return 'ENTERO';

[a-zA-Z][a-zA-Z0-9_]*           return 'IDENTIFICADOR';

"@"[a-zA-Z][a-zA-Z0-9_]*        return 'ARROBA_VAR';

// Para caracteres escapados
"'"('\\'.)"'"                   return 'VALOR_CHAR'; 

"'"."'"                         return 'VALOR_CHAR';


/*------***---Reconocimiento de valores de String---***------*/

"\""                    { this.begin('string'); return 'COMILLA'; }

<string>"\""            { this.popState(); return 'COMILLA'; }

<string>[^"\\\n]+       { return 'TEXTO_PLANO'; }
<string>"\\\""          { return 'TEXTO_PLANO'; } 
<string>"\\\\"          { return 'TEXTO_PLANO'; } 

<string>\n              { 
    this.popState(); 
    return 'ERROR_STRING_NO_CERRADO'; 
}


"`"                     { this.begin('backstring'); return 'BACKTICK'; }

/* --- Reglas DENTRO del estado backstring --- */

<backstring>"$"[a-zA-Z][a-zA-Z0-9_]* { 
    yytext = yytext.slice(1); 
    return 'VAR_INTERPOLADA'; 
}

<backstring>[^`$]+       { return 'TEXTO_BACKSTRING'; }

<backstring>"\\$"        { return 'TEXTO_BACKSTRING'; }

<backstring>"`"          { this.popState(); return 'BACKTICK'; }

.                           {
                                if (!yy.errores) yy.errores = [];
                                
                                yy.errores.push({
                                    lexema: yytext,
                                    tipo: "Lexico",
                                    fila: yylloc.first_line,
                                    columna: yylloc.first_column + 1,
                                    descripcion: "Caracter no valido en el lenguaje .y"
                                });
                            }

<<EOF>>                         return 'EOF';

/lex


/*---****===== Seccion del analizador Sintactico =====****---*/

%{
    /* Diccionario para traducir tokens tecnicos a nombres amigables */
    const diccionarioTokens = {
        "PUNTO_COMA": "';'",
        "COMA": "' , '",
        "LLAVE_APERTURA": "'{'",
        "LLAVE_CIERRE": "'}'",
        "PARENT_APERTURA": "'('",
        "PARENT_CIERRE": "')'",
        "CORCHETE_APERTURA": "'('",
        "CORCHETE_CIERRE": "')'",
        "MAS": "'+'",
        "MENOS": "'-'",
        "MULTIPLICACION": "'*'",
        "DIVISION": "'/'",
        "MODULO": "'%'",
        "FOR": "'for'",
        "IGUAL": "'='",
        "EOF": "el fin del archivo"
    };

    /* Función auxiliar para reportar errores al arreglo global */
    function reportarError(yy, info) {
        const nuevoError = {
            tipo: 'ERROR_SINTACTICO',
            descripcion: info.descripcion,
            fila: info.loc.first_line,
            columna: info.loc.first_column + 1
        };
    
        yy.errores.push({
            lexema: info.texto || "N/A",
            tipo: "Sintactico",
            fila: nuevoError.fila,
            columna: nuevoError.columna,
            descripcion: nuevoError.descripcion
        });
    
        return nuevoError;
    } 

    /* Funcion auxiliar para traducir los tokens esperados que Jison provee */
    function traducirEsperados(esperados) {

        if (!esperados || esperados.length === 0) return "algo diferente";

        const traducidos = esperados.map(token => {
            const tokenLimpio = token.replace(/'/g, "");
            return diccionarioTokens[tokenLimpio] || tokenLimpio;
        });

        if (traducidos.length > 1) {
            const ultimo = traducidos.pop();
            return traducidos.join(", ") + " o " + ultimo;
        }
        return traducidos[0];
    }
%}


/*----***Definicion de presedencia***----*/

/*----***Definicion de operadores logicos***----*/

%left 'OR'
%left 'AND'

/*----***Definicion de operadores de comparacion***----*/

%left 'IGUALACION' 'DIFERENTE'
%left 'MAYOR' 'MENOR' 'MAYOR_IGUAL' 'MENOR_IGUAL'

/*----***Definicion de operadores matematicos***----*/

%left 'MAS' 'MENOS'
%left 'MULTIPLICACION' 'DIVISION' 'MODULO'
%right 'NOT' 'UMENOS'

/*----Simbolo inicial----*/

%start inicio

%%

/*-----=====-----Produccion principal de inicio de lectura-----=====-----*/

inicio  : definicion_lenguaje  EOF 
        { 
            return $1; 
        }
        | error EOF 
        {
            reportarError(yy, {
                descripcion: 'Error en la estructura del archivo de yfera',
                loc: @1,
                texto: yytext
            });

            return null; 
        }
        ;

/*-----=====-----Produccion principal de la definicion del lenguaje .y-----=====-----*/

definicion_lenguaje         : definicion_lenguaje cuerpo_lenguaje
                            {{
                                $1.push($2);
                                $$  = $1;
                            }}
                            | cuerpo_lenguaje
                            {{
                                $$ = [$1];
                            }}
                            ;

/*-----=====-----Produccion principal del cuerpo que puede tener el archivo .y-----=====-----*/

cuerpo_lenguaje             : IMPORT cadena_texto PUNTO_COMA
                            {{
                                $$ = {
                                    tipo: 'INSTRUCCION_IMPORT',
                                    ruta: $2, 
                                    linea: @1.first_line,
                                    columna: @1.first_column + 1
                                };
                            }}
                            | FUNCTION IDENTIFICADOR CORCHETE_APERTURA lista_parametros_def CORCHETE_CIERRE LLAVE_APERTURA cuerpo_funciones LLAVE_CIERRE
                            {{
                                $$ = {
                                    tipo: 'FUNCION',
                                    id: $2,
                                    parametros: $4,
                                    cuerpo: $7,
                                    linea: @1.first_line,
                                    columna: @1.first_column + 1
                                };
                            }}
                            | MAIN LLAVE_APERTURA cuerpo_main LLAVE_CIERRE
                            {{
                                $$ = {
                                    tipo: 'FUNCION_MAIN',
                                    cuerpo: $3,
                                    linea: @1.first_line,
                                    columna: @1.first_column + 1
                                };
                            }}
                            | tipo_variable IDENTIFICADOR IGUAL expresion_logica PUNTO_COMA
                            {{
                                $$ = {
                                    tipo: 'DECLARACION_VARIABLE',
                                    tipado: $1,
                                    id: $2, 
                                    valor: $4,
                                    linea: @1.first_line,
                                    columna: @1.first_column + 1
                                };
                            }}
                            | tipo_variable CORCHETE_APERTURA CORCHETE_CIERRE IDENTIFICADOR IGUAL CORCHETE_APERTURA valor_arreglo CORCHETE_CIERRE PUNTO_COMA
                            {{
                                $$ = {
                                    tipo: 'ARREGLO_VACIO',
                                    tipado: $1,
                                    id: $4, 
                                    amplitud: $7,
                                    linea: @1.first_line,
                                    columna: @1.first_column + 1
                                };
                            }}
                            | tipo_variable CORCHETE_APERTURA CORCHETE_CIERRE IDENTIFICADOR IGUAL LLAVE_APERTURA lista_expresiones LLAVE_CIERRE PUNTO_COMA
                            {{
                                $$ = {
                                    tipo: 'ARREGLO_INICIALIZADO',
                                    tipado: $1,
                                    id: $4, 
                                    valores: $7,
                                    linea: @1.first_line,
                                    columna: @1.first_column + 1
                                };
                            }}
                            | tipo_variable CORCHETE_APERTURA CORCHETE_CIERRE IDENTIFICADOR IGUAL EXECUTE query_database PUNTO_COMA
                            {{
                                $$ = {
                                    tipo: 'ARREGLO_QUERY',
                                    tipado: $1,
                                    id: $4, 
                                    query: $7,
                                    linea: @1.first_line,
                                    columna: @1.first_column + 1
                                };
                            }}
                            | error PUNTO_COMA
                            {{
                                reportarError(yy, {
                                    descripcion: 'Error de sintaxis en la definicion global cerca de punto y coma',
                                    loc: @1,
                                    texto: yytext
                                });
                                $$ = null;
                            }}
                            | error LLAVE_CIERRE
                            {{
                                reportarError(yy, {
                                    descripcion: 'Error de sintaxis cerca del cierre de bloque.',
                                    loc: @1,
                                    texto: yytext
                                });
                                $$ = null;
                            }}
                            ;


/*-----=====-----Produccion que permite representar listado de instrucciones dentro de la funcion main-----=====-----*/

bloque_instrucciones            : bloque_instrucciones instruccion
                                {{
                                    $1.push($2);
                                    $$ = $1;
                                }}
                                | instruccion
                                {{
                                    $$ = [$1];
                                }}
                                | /* vacio */
                                {{
                                    $$ = [];
                                }}
                                ;


/*-----=====-----Produccion que permite representar cada posible instruccion que puede tener el main dentro-----=====-----*/

instruccion                 : ARROBA_VAR PARENT_APERTURA lista_argumentos PARENT_CIERRE PUNTO_COMA
                            {{
                                $$ = {
                                    tipo: 'LLAMADA_ARROBA_VAR',
                                    argumentos: $3,
                                    linea: @1.first_line,
                                    columna: @1.first_column + 1
                                };
                            }}
                            | WHILE PARENT_APERTURA expresion_logica PARENT_CIERRE LLAVE_APERTURA bloque_instrucciones LLAVE_CIERRE
                            {{
                                $$ = {
                                    tipo: 'CICLO_WHILE',
                                    condicion: $3,
                                    cuerpo: $6,
                                    linea: @1.first_line,
                                    columna: @1.first_column + 1
                                };
                            }}
                            | estructura_for
                            {{
                                $$ = $1;
                            }}
                            | DO LLAVE_APERTURA bloque_instrucciones LLAVE_CIERRE WHILE PARENT_APERTURA expresion_logica PARENT_CIERRE
                            {{
                                $$ = {
                                    tipo: 'CICLO_DO_WHILE',
                                    cuerpo: $3,
                                    condicion: $7,
                                    linea: @1.first_line,
                                    columna: @1.first_column + 1
                                };
                            }}
                            | operaciones_basicas
                            {{
                                $$ = $1;
                            }}
                            | sentencia_if
                            {{
                                $$ = $1;
                            }}
                            | BREAK PUNTO_COMA
                            {{
                                $$ = {
                                    tipo: 'BREAK',
                                    linea: @1.first_line,
                                    columna: @1.first_column + 1
                                };
                            }}
                            | CONTINUE PUNTO_COMA
                            {{
                                $$ = {
                                    tipo: 'CONTINUE',
                                    linea: @1.first_line,
                                    columna: @1.first_column + 1
                                };
                            }}
                            | error PUNTO_COMA
                            {{
                                reportarError(yy, {
                                    descripcion: 'Se esperaba una instrucción valida antes del punto y coma.',
                                    loc: @1,
                                    texto: yytext
                                });
                                $$ = null;
                            }}
                            ;

/*-----=====-----Produccion que permite definir la produccion de la estructura del for-----=====-----*/

estructura_for              : FOR PARENT_APERTURA IDENTIFICADOR IGUAL expresion_logica PUNTO_COMA expresion_logica PUNTO_COMA IDENTIFICADOR IGUAL expresion_logica PARENT_CIERRE LLAVE_APERTURA bloque_instrucciones LLAVE_CIERRE
                            {{
                                $$ = {
                                    tipo: 'CICLO_FOR',
                                    variable: $3,
                                    inicio: $5,
                                    condicion: $7,
                                    actualizacion: {
                                        tipo: 'ASIGNACION',
                                        id: $9,
                                        valor: $11
                                    },
                                    cuerpo: $14, 
                                    linea: @1.first_line,
                                    columna: @1.first_column + 1
                                };
                            }}
                            | FOR PARENT_APERTURA IDENTIFICADOR IGUAL expresion_logica PUNTO_COMA expresion_logica PUNTO_COMA IDENTIFICADOR MAS MAS PARENT_CIERRE LLAVE_APERTURA bloque_instrucciones LLAVE_CIERRE
                            {{
                                $$ = {
                                    tipo: 'CICLO_FOR',
                                    variable: $3,
                                    inicio: $5,
                                    condicion: $7,
                                    actualizacion: {
                                        tipo: 'INCREMENTO_SIMPLE',
                                        id: $9,
                                        valor: 1
                                    },
                                    cuerpo: $14,
                                    linea: @1.first_line,
                                    columna: @1.first_column + 1
                                };
                            }}
                            ;

/*-----=====-----Produccion que permite definir la produccion de switch-----=====-----*/

sentencia_switch            : SWITCH PARENT_APERTURA expresion_logica PARENT_CIERRE LLAVE_APERTURA lista_casos LLAVE_CIERRE
                            {{
                                $$ = {
                                    tipo: 'ESTRUCTURA_SWITCH',
                                    expresion: $3,
                                    casos: $6,
                                    linea: @1.first_line,
                                    columna: @1.first_column + 1
                                };
                            }}
                            ;

/*-----=====-----Produccion que permite definir la lista de casos que puede tener el switch-----=====-----*/

lista_casos                 : lista_casos caso
                            {{
                                $1.push($2);
                                $$ = $1;
                            }}
                            | caso
                            {{
                                $$ = [$1];
                            }}
                            | /* vacio*/
                            {{
                                $$ = [];
                            }}
                            ;

/*-----=====---*****--Produccion que permite definir los casos y el cuerpo de los casos--*****---=====-----*/

caso                        : CASE expresion_logica DOS_PUNTOS bloque_instrucciones
                            {{
                                $$ = {
                                    tipo: 'CASO',
                                    valor: $2,
                                    instrucciones: $4,
                                    linea: @1.first_line,
                                    columna: @1.first_column + 1
                                };
                            }}
                            | DEFAULT DOS_PUNTOS bloque_instrucciones
                            {{
                                $$ = {
                                    tipo: 'DEFAULT',
                                    instrucciones: $3,
                                    linea: @1.first_line,
                                    columna: @1.first_column + 1
                                };
                            }}
                            ;


/*-----=====-----Produccion que permite representar los posibles casos de reasignacion de variables u operaciones diferentes-----=====-----*/

operaciones_basicas             : IDENTIFICADOR IGUAL expresion_logica PUNTO_COMA
                                {{
                                    $$ = {
                                        tipo: 'ASIGNACION',
                                        id: $1,
                                        valor: $3,
                                        linea: @1.first_line,
                                        columna: @1.first_column + 1
                                    };
                                }}
                                | IDENTIFICADOR CORCHETE_APERTURA expresion_logica CORCHETE_CIERRE IGUAL expresion_logica PUNTO_COMA
                                {{
                                    $$ = {
                                        tipo: 'ASIGNACION_ARREGLO',
                                        id: $1,
                                        indice: $3,  
                                        valor: $6,  
                                        linea: @1.first_line,
                                        columna: @1.first_column + 1
                                    };
                                }}
                                ;

/*-----=====-----Produccion que permite representar el listado de los parametros dentro de una funcion-----=====-----*/

lista_parametros_def    : lista_parametros_def COMA parametro_def
                        {{
                            $1.push($3);
                            $$ = $1;
                        }}
                        | parametro_def
                        {{
                            $$ = [$1];
                        }}
                        | /* vacio */
                        {{
                            $$ = [];
                        }}
                        ;


/*-----=====-----Produccion que permite representar a los parametros dentro de una funcion-----=====-----*/

parametro_def           : tipo_variable IDENTIFICADOR
                        {{
                            $$ = {
                                tipo: 'PARAMETRO_DEF',
                                tipado: $1,
                                id: $2,
                                linea: @1.first_line,
                                columna: @1.first_column + 1
                            };
                        }}
                        | tipo_variable CORCHETE_APERTURA CORCHETE_CIERRE IDENTIFICADOR
                        {{
                            $$ = {
                                tipo: 'PARAMETRO_DEF_ARREGLO',
                                tipado: $1,
                                id: $4,
                                linea: @1.first_line,
                                columna: @1.first_column + 1
                            };
                        }}
                        ;

/*-----=====-----Produccion que permite representar los posibles parametros que se reciben dentro de un componente-----=====-----*/

lista_argumentos        : lista_argumentos COMA parametro
                        {{
                            $1.push($3);
                            $$ = $1;
                        }}
                        | parametro
                        {{
                            $$ = [$1];
                        }}
                        | /* vacio */
                        {{
                            $$ = [];
                        }}
                        ;

/*-----=====-----Produccion que permite representar los posibles parametros que se reciben dentro de un componente-----=====-----*/

parametro               : expresion_logica
                        {{
                            $$ = $1;
                        }}
                        | IDENTIFICADOR CORCHETE_APERTURA expresion_logica CORCHETE_CIERRE
                        {{
                            $$ = {
                                tipo: 'ACCESO_ARREGLO',
                                id: $1,
                                indice: $3,
                                linea: @1.first_line,
                                columna: @1.first_column + 1
                            };
                        }}
                        | error
                        {{
                            reportarError(yy, {
                                descripcion: 'Error de sintaxis en el parámetro.',
                                loc: @1,
                                texto: yytext
                            });
                            $$ = null;
                        }}
                        ;

/*-----=====-----Produccion que permite representar el cuerpo principal de la funcion main-----=====-----*/

sentencia_if            : IF PARENT_APERTURA expresion_logica PARENT_CIERRE LLAVE_APERTURA bloque_instrucciones LLAVE_CIERRE opcional_else
                        {{
                            $$ = {
                                tipo: 'ESTRUCTURA_IF',
                                condicion: $3,
                                instrucciones_true: $6,
                                instrucciones_false: $8,
                                linea: @1.first_line,
                                columna: @1.first_column + 1
                            };
                        }}
                        ;


/*-----=====-----Producciones que representan a los else que puede llevar el if-----=====-----*/

opcional_else           : ELSE sentencia_if
                        {{
                            $$ = $2; 
                        }}
                        | ELSE LLAVE_APERTURA bloque_instrucciones LLAVE_CIERRE
                        {{
                            $$ = $3; 
                        }}
                        | /* vacio */
                        {{
                            $$ = null; 
                        }}
                        ;


/*-----=====-----Produccion que permite representar al listado de instrucciones dentro de una funcion-----=====-----*/

cuerpo_funciones        : cuerpo_funciones instruccion_funcion
                        {{
                            $1.push($2);
                            $$ = $1;
                        }}
                        | instruccion_funcion
                        {{
                            $$ = [$1]; 
                        }}
                        ;

/*-----=====-----Produccion que define las instrucciones que pueden tener dentro las funciones-----=====-----*/

instruccion_funcion         : EXECUTE query_database PUNTO_COMA
                            {{
                                $$ = {
                                    tipo: 'DATABASE_QUERY',
                                    query: $2,
                                    linea: @1.first_line,
                                    columna: @1.first_column + 1
                                };
                            }}
                            | LOAD IDENTIFICADOR PUNTO_COMA
                            {{
                                $$ = {
                                    tipo: 'LOAD_ID',
                                    id: $2,
                                    linea: @1.first_line,
                                    columna: @1.first_column + 1
                                };  
                            }}
                            | LOAD cadena_texto PUNTO_COMA
                            {{
                                $$ = {
                                    tipo: 'LOAD_ARCHIVO',
                                    uri: $2,
                                    linea: @1.first_line,
                                    columna: @1.first_column + 1
                                };  
                            }}
                            ;


/*-----=====-----Produccion principal para las querys en la base de datos .y-----=====-----*/

query_database          : BACKTICK contenido_query BACKTICK
                        {{
                            $$ = {
                                tipo: 'QUERY_TEMPLATE',
                                fragmentos: $2,
                                linea: @1.first_line,
                                columna: @1.first_column + 1
                            };
                        }}
                        ;

/*-----=====-----Produccion principal para el contenido de la query en el .y-----=====-----*/

contenido_query         : contenido_query elemento_query
                        {{
                            $1.push($2);
                            $$ = $1;
                        }}
                        | /* vacio */
                        {{
                            $$ = [];
                        }}
                        ;

/*-----=====-----Produccion principal para el contenido de la query en el .y-----=====-----*/

elemento_query          : TEXTO_BACKSTRING
                        {{
                            $$ = { 
                                tipo: 'TEXTO_QUERY', 
                                valor: $1,
                                linea: @1.first_line,
                                columna: @1.first_column + 1
                            };
                        }}
                        | VAR_INTERPOLADA
                        {{
                            $$ = { 
                                tipo: 'VAR_INTERPOLADA', 
                                id: $1,
                                linea: @1.first_line,
                                columna: @1.first_column + 1
                            };
                        }}
                        ;


/*-----=====-----Produccion principal para los valores de inicializacion del arreglo .y-----=====-----*/
lista_expresiones           : lista_expresiones COMA expresion_logica
                            {{ 
                                $1.push($3); 
                                $$ = $1; 
                            }}
                            | expresion_logica
                            {{ 
                                $$ = [$1]; 
                            }}
                            ;

/*-----=====-----Produccion principal para los valores que pueden contener los arreglos dentro de su inicializacion directa .y-----=====-----*/

valor_arreglo               : expresion_logica
                            {{
                                $$ = $1;
                            }}
                            ;

/*-----=====-----Produccion principal para las expresiones permitidas en el lenguaje (precedencia OR) en .y-----=====-----*/

expresion_logica            : expresion_logica OR expresion_and
                            {{ 
                                $$ = { 
                                    tipo: 'LOGICA', 
                                    op: 'OR', 
                                    izq: $1, 
                                    der: $3 
                                }; 
                            }}
                            | expresion_and
                            {{ 
                                $$ = $1; 
                            }}
                            ;

/*-----=====-----Produccion principal para las expresiones permitidas en el lenguaje (precedencia AND) en .y-----=====-----*/

expresion_and           : expresion_and AND expresion_igualdad
                        {{ 
                            $$ = { 
                                tipo: 'LOGICA', 
                                op: 'AND', 
                                izq: $1, 
                                der: $3 
                            }; 
                        }}
                        | expresion_igualdad
                        {{ 
                            $$ = $1; 
                        }}
                        ;

/*-----=====-----Produccion principal para las expresiones permitidas en el lenguaje (precedencia de las igualaciones o diferencias) en .y-----=====-----*/

expresion_igualdad              : expresion_igualdad IGUALACION expresion_relacional
                                {{ 
                                    $$ = { 
                                        tipo: 'RELACIONAL', 
                                        op: 'IGUALACION', 
                                        izq: $1, 
                                        der: $3 
                                    }; 
                                }}
                                | expresion_igualdad DIFERENTE expresion_relacional
                                {{ 
                                    $$ = { 
                                        tipo: 'RELACIONAL', 
                                        op: 'DIFERENCIA', 
                                        izq: $1, 
                                        der: $3 
                                    }; 
                                }}
                                | expresion_relacional
                                {{ 
                                    $$ = $1; 
                                }}
                                ;


/*-----=====-----Produccion principal para las expresiones permitidas en el lenguaje (mayores y menores) en .y-----=====-----*/

expresion_relacional            : expresion_relacional MAYOR expresion_aditiva
                                {{ 
                                    $$ = { 
                                        tipo: 'RELACIONAL', 
                                        op: 'MAYOR', 
                                        izq: $1, 
                                        der: $3 
                                    }; 
                                }}
                                | expresion_relacional MENOR expresion_aditiva
                                {{ 
                                    $$ = { 
                                        tipo: 'RELACIONAL', 
                                        op: 'MENOR', 
                                        izq: $1, 
                                        der: $3 
                                    }; 
                                }}
                                | expresion_relacional MAYOR_IGUAL expresion_aditiva
                                {{ 
                                    $$ = { 
                                        tipo: 'RELACIONAL', 
                                        op: 'MAYOR_IGUAL', 
                                        izq: $1, 
                                        der: $3 
                                    }; 
                                }}
                                | expresion_relacional MENOR_IGUAL expresion_aditiva
                                {{ 
                                    $$ = { 
                                        tipo: 'RELACIONAL', 
                                        op: 'MENOR_IGUAL', 
                                        izq: $1, 
                                        der: $3 
                                    }; 
                                }}
                                | expresion_aditiva
                                {{ 
                                    $$ = $1; 
                                }}
                                ;


/*-----=====-----Produccion principal para las expresiones permitidas en el lenguaje (sumas y restas) en .y-----=====-----*/

expresion_aditiva           : expresion_aditiva MAS expresion_multiplicativa
                            {{ 
                                $$ = { 
                                    tipo: 'ARITMETICA', 
                                    op: 'SUMA', 
                                    izq: $1, 
                                    der: $3 
                                }; 
                            }}
                            | expresion_aditiva MENOS expresion_multiplicativa
                            {{ 
                                $$ = { 
                                    tipo: 'ARITMETICA', 
                                    op: 'RESTA', 
                                    izq: $1, 
                                    der: $3 
                                }; 
                            }}
                            | expresion_multiplicativa
                            {{ 
                                $$ = $1; 
                            }}
                            ;

/*-----=====-----Produccion principal para las expresiones permitidas en el lenguaje (multiplicacion, division, modulo) en .y-----=====-----*/

expresion_multiplicativa        : expresion_multiplicativa MULTIPLICACION expresion_unaria
                                {{ 
                                    $$ = { 
                                        tipo: 'ARITMETICA', 
                                        op: 'MULTIPLICACION', izq: 
                                        $1, 
                                        der: $3 
                                    }; 
                                }}
                                | expresion_multiplicativa DIVISION expresion_unaria
                                {{ 
                                    $$ = { 
                                        tipo: 'ARITMETICA', 
                                        op: 'DIVISION', 
                                        izq: $1, 
                                        der: $3 
                                    }; 
                                }}
                                | expresion_multiplicativa MODULO expresion_unaria
                                {{ 
                                    $$ = { 
                                        tipo: 'ARITMETICA', 
                                        op: 'MODULO', 
                                        izq: $1, 
                                        der: $3 
                                    }; 
                                }}
                                | expresion_unaria
                                {{ 
                                    $$ = $1; 
                                }}
                                ;

/*-----=====-----Produccion principal para las expresiones permitidas en el lenguaje (unarias. Valores fijos o negativos) en .y-----=====-----*/


expresion_unaria        : NOT expresion_unaria
                        {{ 
                            $$ = { 
                                tipo: 'UNARIA', 
                                op: 'NOT', 
                                valor: $2 
                            }; 
                        }}
                        | MENOS expresion_unaria
                        {{ 
                            $$ = { 
                                tipo: 'UNARIA', 
                                op: 'MENOS', 
                                valor: $2 
                            }; 
                        }}
                        | valor_primario
                        {{ 
                            $$ = $1; 
                        }}
                        ;


/*-----=====-----Produccion principal para los valores a los que se pueden optar permitidos en el lenguaje  en .y-----=====-----*/

valor_primario              : ENTERO        
                            {{ 
                                $$ = { 
                                    tipo: 'INT', 
                                    valor: $1,
                                    linea: @1.first_line,
                                    columna: @1.first_column + 1  
                                }; 
                            }}
                            | DECIMAL       
                            {{ 
                                $$ = { 
                                    tipo: 'FLOAT', 
                                    valor: $1,
                                    linea: @1.first_line,
                                    columna: @1.first_column + 1 
                                }; 
                            }}
                            | TRUE          
                            {{ 
                                $$ = { 
                                    tipo: 'BOOL', 
                                    valor: true,
                                    linea: @1.first_line,
                                    columna: @1.first_column + 1  
                                }; 
                            }}
                            | FALSE         
                            {{ 
                                $$ = { 
                                    tipo: 'BOOL', 
                                    valor: false,
                                    linea: @1.first_line,
                                    columna: @1.first_column + 1  
                                }; 
                            }}
                            | IDENTIFICADOR 
                            {{ 
                                $$ = { 
                                    tipo: 'ID', 
                                    valor: $1,
                                    linea: @1.first_line,
                                    columna: @1.first_column + 1  
                                }; 
                            }}
                            | IDENTIFICADOR CORCHETE_APERTURA expresion_logica CORCHETE_CIERRE
                            {{
                                $$ = {
                                    tipo: 'ACCESO_ARREGLO',
                                    valor: $1,
                                    indice: $3,
                                    linea: @1.first_line,
                                    columna: @1.first_column + 1
                                };
                            }}
                            | cadena_texto
                            {{
                                $$ = $1; 
                            }}
                            | PARENT_APERTURA expresion_logica PARENT_CIERRE 
                            {{ 
                                $$ = $2; 
                            }}
                            ;

/*-----=====-----Produccion de reconocimiento de cadenas de texto .y-----=====-----*/

cadena_texto            : COMILLA contenido_cadena COMILLA
                        {{
                            $$ = {
                                tipo: 'VALOR_CADENA',
                                valor: $2,
                                linea: @1.first_line,
                                columna: @1.first_column + 1
                            };
                        }}
                        | COMILLA COMILLA 
                        {{
                            $$ = {
                                tipo: 'VALOR_CADENA',
                                valor: "",
                                linea: @1.first_line,
                                columna: @1.first_column + 1
                            };
                        }}
                        ;

/*-----=====-----Produccion que define los textos concatenados .y-----=====-----*/

contenido_cadena        : contenido_cadena TEXTO_PLANO
                        {{
                            $$ = $1 + $2; 
                        }}
                        | TEXTO_PLANO                 
                        {{
                            $$ = $1; 
                        }}
                        ;


/*-----=====-----Produccion principal que sube todos los tipos de variables que se permiten en el .y-----=====-----*/

tipo_variable           : INT
                        {{
                            $$  = 'ENTERA';
                        }}
                        | FLOAT
                        {{
                            $$  = 'FLOAT';
                        }}
                        | BOOLEAN
                        {{
                            $$  = 'BOOLEANA';
                        }}
                        | STRING 
                        {{
                            $$  = 'CADENA';
                        }}
                        | CHAR
                        {{
                            $$  = 'CARACTER';
                        }}
                        ;
