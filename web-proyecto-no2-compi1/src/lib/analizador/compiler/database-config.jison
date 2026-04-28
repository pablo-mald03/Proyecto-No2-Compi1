/* Seccion analizador Lexico */

%lex
%options ranges yylineno
%%

/*Espacios y saltos de linea*/

\s+                   /* ignorar espacios */

[\u200B\uFEFF\u200E\u200F\u202A-\u202E]+ /* Ignorar caracteres basura */

/*---*****----Apartado de comentarios----*****---*/

"#".*           /*Ignorar comentario de linea*/

"/*"([^*]|\*+[^*/])*(\*+"/")           /*Ignorar comentario multilinea*/ 

/*---*****----Apartado de palabras reservadas ----*****---*/

"TABLE"                         return 'TABLE';

"COLUMNS"                         return 'COLUMNS';

"DELETE"                         return 'DELETE';

"IN"                         return 'IN';

/*---*****----Apartado de tipos de datos----*****---*/

"NULL"|"INTEGER"|"INT"|"TINYINT"|"BIGINT"|"REAL"|"DOUBLE"|"FLOAT"|"TEXT"|"VARCHAR"|"CHAR"|"DECIMAL"|"NUMERIC"|"BOOLEAN"|"DATE"|"BLOB"|"VARBINARY"                         return 'TIPO';


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

/*------***--- Agrupaciones y delimitadores ---***------*/

"("                         return 'PARENT_APERTURA';

")"                         return 'PARENT_CIERRE';

/*---*****---- Apartado de caracteres especiales ----*****---*/

"["                         return 'CORCHETE_APERTURA';

"]"                         return 'CORCHETE_CIERRE';

"="                         return 'IGUAL';

";"                         return 'PUNTO_COMA';

","                         return 'COMA';

"."                         return 'PUNTO';


/*------***--- Reconocimiento de numeros decimales y enteros---***------*/

[0-9]+(\.[0-9]+)?\b             return 'NUMERO';

\"[^\"]*\"                  { yytext = yytext.substr(1, yyleng-2); return 'STRING'; }


/*------***--- Reconocimiento de nombres de atributos y tablas---***------*/

[a-zA-Z_][a-zA-Z0-9_-]*         return 'IDENTIFICADOR';

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
        "CORCHETE_APERTURA": "'['",
        "CORCHETE_CIERRE": "']'",
        "DELETE": "DELETE",
        "TABLE": "TABLE",
        "IN": "IN",
        "COLUMNS": "COLUMNS",
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

inicio  : instrucciones EOF
        { 
            return $1; 
        }
        | error EOF 
        {
            reportarError(yy, {
                descripcion: 'Error en la estructura del comando sql',
                loc: @1,
                texto: yytext
            });

            return null; 
        }
        ;

/*-----=====-----Produccion principal de la definicion del lenguaje sql-----=====-----*/

instrucciones : instrucciones instruccion 
                {{ 
                    $1.push($2); 
                    $$ = $1; 
                }}
                | instruccion              
                {{ 
                    $$ = [$1]; 
                }}
                ;

/*-----=====-----Produccion principal de la definicion del lenguaje sql-----=====-----*/

instruccion     : creacion_tabla PUNTO_COMA     
                {{ 
                    $$ = $1; 
                }}
                | acceso_columna PUNTO_COMA     
                {{ 
                    $$ = $1; 
                }}
                | insercion_registro  PUNTO_COMA      
                {{ 
                    $$ = $1; 
                }}
                | actualizacion_registro PUNTO_COMA 
                {{
                    $$ = $1; 
                }}
                | eliminacion_registro PUNTO_COMA   
                {{ 
                    $$ = $1; 
                }}
                | error PUNTO_COMA 
                { 
                    reportarError(yy, {
                        descripcion: 'Error en la estructura cerca del punto y coma',
                        loc: @1,
                        texto: yytext
                    });

                    return null; 
                }
                ;

/*-----=====-----Produccion para la estructura de la creacion de una tabla-----=====-----*/

creacion_tabla          : TABLE IDENTIFICADOR COLUMNS lista_definiciones
                        {{ 
                            $$ = { 
                                accion: 'CREATE', 
                                tabla: $2, 
                                columnas: $4, 
                                loc_linea: @1.first_line,
                                loc_columna: @1.first_column + 1 
                            }; 
                        }}
                        ;

/*-----=====-----Produccion para la estructura de los campos de una tabla-----=====-----*/

lista_definiciones      : lista_definiciones COMA definicion 
                        {{ 
                            $1.push($3); 
                            $$ = $1; 
                        }}
                        | definicion                        
                        {{ 
                            $$ = [$1]; 
                        }}
                        ;

/*-----=====-----Produccion para la estructura de la definicion de un tipo de atributo sql-----=====-----*/

definicion          : IDENTIFICADOR IGUAL TIPO 
                    {{ 
                        $$ = { 
                            id: $1, 
                            tipo: $3, 
                            loc_linea: @1.first_line,
                            loc_columna: @1.first_column + 1 
                        }; 
                    }}
                    ;


/*-----=====-----Produccion para la definicion del acceso a columnas-----=====-----*/

acceso_columna      : IDENTIFICADOR PUNTO IDENTIFICADOR 
                    {{ 
                        $$ = { 
                            accion: 'SELECT_COL', 
                            tabla: $1, 
                            columna: $3, 
                            loc_linea: @1.first_line,
                            loc_columna: @1.first_column + 1 
                        }; 
                    }}
                    ;

/*-----=====-----Produccion para la definicion de insercion de registros-----=====-----*/

insercion_registro      : IDENTIFICADOR CORCHETE_APERTURA lista_asignaciones CORCHETE_CIERRE
                        {{
                            $$ = { 
                                accion: 'INSERT', 
                                tabla: $1, 
                                valores: $3, 
                                loc_linea: @1.first_line,
                                loc_columna: @1.first_column + 1
                            }; 
                        }}
                        ;

/*-----=====-----Produccion para la definicion de actualizacion de registros-----=====-----*/

actualizacion_registro          : insercion_registro IN expresion
                                {{ 
                                    $1.accion = 'UPDATE'; 
                                    $1.id = $3; 
                                    $$ = $1; 
                                }}
                                ;

/*-----=====-----Produccion para la definicion de eliminacion de registros-----=====-----*/

eliminacion_registro            : IDENTIFICADOR R_DELETE expresion
                                {{ 
                                    $$ = { 
                                        accion: 'DELETE', 
                                        tabla: $1, 
                                        id: $3,
                                        loc_linea: @1.first_line,
                                        loc_columna: @1.first_column + 1
                                    }; 
                                }}
                                ;

/*-----=====-----Produccion para la definicion de las asignaciones de valores-----=====-----*/

lista_asignaciones          : lista_asignaciones COMA asignacion 
                            {{ 
                                $1.push($3); 
                                $$ = $1; 
                            }}
                            | asignacion                        
                            {{ 
                                $$ = [$1]; 
                            }}
                            ;

/*-----=====-----Produccion para la definicion de las asignaciones-----=====-----*/

asignacion          : IDENTIFICADOR IGUAL expresion 
                    {{ 
                        $$ = { 
                            col: $1, 
                            valor: $3,
                            loc_linea: @1.first_line, 
                            loc_columna: @1.first_column + 1
                        }; 
                    }}
                    ;

/*-----=====-----Produccion para la definicion de las expresiones-----=====-----*/

expresion           : expresion MAS expresion
                    {{
                        $$ = { 
                            tipo: 'OPERACION', 
                            operador: 'MAS', 
                            izq: $1, 
                            der: $3, 
                            linea: @1.first_line, 
                            columna: @1.first_column + 1 
                        };
                    }}
                    | expresion MENOS expresion
                    {{
                        $$ = { 
                            tipo: 'OPERACION', 
                            operador: 'MENOS', 
                            izq: $1, 
                            der: $3, 
                            linea: @1.first_line, 
                            columna: @1.first_column + 1 
                        };
                    }}
                    | expresion MULTIPLICACION expresion
                    {{
                        $$ = { 
                            tipo: 'OPERACION', 
                            operador: 'MULTIPLICACION', 
                            izq: $1, 
                            der: $3, 
                            linea: @1.first_line, 
                            columna: @1.first_column + 1 
                        };
                    }}
                    | expresion DIVISION expresion
                    {{
                        $$ = { 
                            tipo: 'OPERACION', 
                            operador: 'DIVISION', 
                            izq: $1, 
                            der: $3, 
                            linea: @1.first_line, 
                            columna: @1.first_column + 1 
                        };
                    }}
                    | expresion MODULO expresion
                    {{
                        $$ = { 
                            tipo: 'OPERACION', 
                            operador: 'MODULO', 
                            izq: $1, 
                            der: $3, 
                            linea: @1.first_line, 
                            columna: @1.first_column + 1 
                        };
                    }}
                    | expresion MAYOR expresion
                    {{
                        $$ = { 
                            tipo: 'OPERACION', 
                            operador: 'MAYOR', 
                            izq: $1, 
                            der: $3, 
                            linea: @1.first_line, 
                            columna: @1.first_column + 1 
                        };
                    }}
                    | expresion MENOR expresion
                    {{
                        $$ = { 
                            tipo: 'OPERACION', 
                            operador: 'MENOR', 
                            izq: $1, 
                            der: $3, 
                            linea: @1.first_line, 
                            columna: @1.first_column + 1 
                        };
                    }}
                    | expresion MAYOR_IGUAL expresion
                    {{
                        $$ = { 
                            tipo: 'OPERACION', 
                            operador: 'MAYOR_IGUAL', 
                            izq: $1, 
                            der: $3, 
                            linea: @1.first_line, 
                            columna: @1.first_column + 1 
                        };
                    }}
                    | expresion MENOR_IGUAL expresion
                    {{
                        $$ = { 
                            tipo: 'OPERACION', 
                            operador: 'MENOR_IGUAL', 
                            izq: $1, 
                            der: $3, 
                            linea: @1.first_line, 
                            columna: @1.first_column + 1 
                        };
                    }}
                    | expresion IGUALACION expresion
                    {{
                        $$ = { 
                            tipo: 'OPERACION', 
                            operador: 'IGUALACION', 
                            izq: $1, 
                            der: $3, 
                            linea: @1.first_line, 
                            columna: @1.first_column + 1 
                        };
                    }}
                    | expresion DIFERENTE expresion
                    {{
                        $$ = { 
                            tipo: 'OPERACION', 
                            operador: 'DIFERENTE', 
                            izq: $1, 
                            der: $3, 
                            linea: @1.first_line, 
                            columna: @1.first_column + 1 
                        };
                    }}
                    | expresion OR expresion
                    {{
                        $$ = { 
                            tipo: 'OPERACION', 
                            operador: 'OR', 
                            izq: $1, 
                            der: $3, 
                            linea: @1.first_line, 
                            columna: @1.first_column + 1 
                        };
                    }}
                    | expresion AND expresion
                    {{
                        $$ = { 
                            tipo: 'OPERACION', 
                            operador: 'AND', 
                            izq: $1, 
                            der: $3, 
                            linea: @1.first_line, 
                            columna: @1.first_column + 1 
                        };
                    }}
                    | MENOS expresion %prec UMENOS
                    {{
                        $$ = { 
                            tipo: 'OPERACION_UNARIA', 
                            operador: 'MENOS_UNARIO', 
                            valor: $2, 
                            linea: @1.first_line, 
                            columna: @1.first_column + 1 
                        };
                    }}
                    | NOT expresion
                    {{
                        $$ = { 
                            tipo: 'OPERACION_UNARIA', 
                            operador: 'NOT', 
                            valor: $2, 
                            linea: @1.first_line, 
                            columna: @1.first_column + 1 
                        };
                    }}
                    | PARENT_APERTURA expresion PARENT_CIERRE
                    {{
                        $$ = $2; 
                    }}
                    | STRING 
                    {{ 
                        $$ = { 
                            tipo: 'VALOR', 
                            tipo_dato: 'STRING', 
                            valor: $1, 
                            linea: @1.first_line, 
                            columna: @1.first_column + 1 
                        }; 
                    }}
                    | NUMERO 
                    {{
                        $$ = { 
                            tipo: 'VALOR', 
                            tipo_dato: 'NUMERO', 
                            valor: Number($1), 
                            linea: @1.first_line, 
                            columna: @1.first_column + 1 
                        }; 
                    }}
                    ;
