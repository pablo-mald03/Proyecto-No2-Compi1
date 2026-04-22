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
                | insercion_registro        
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

actualizacion_registro          : insercion_registro IN NUMERO
                                {{ 
                                    $1.accion = 'UPDATE'; 
                                    $1.id = $3; 
                                    $$ = $1; 
                                }}
                                ;

/*-----=====-----Produccion para la definicion de eliminacion de registros-----=====-----*/

eliminacion_registro            : IDENTIFICADOR R_DELETE NUMERO
                                {{ 
                                    $$ = { 
                                        accion: 'DELETE', 
                                        tabla: $1, 
                                        id: Number($3),
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

expresion           : STRING 
                    {{ 
                        $$ = $1; 
                    }}
                    | NUMERO {{
                        $$ = Number($1); 
                    }}
                    ;
