/* Seccion analizador Lexico */

%lex
%options ranges yylineno
%%

/*Espacios y saltos de linea*/

\s+                   /* ignorar espacios */

[\u200B\uFEFF\u200E\u200F\u202A-\u202E]+ /* Ignorar caracteres basura */

/*------***---Reconocimiento de colores hexadecimales---***------*/

"#"[0-9A-Fa-f]{6}             return 'HEX_COLOR';
"#"[0-9A-Fa-f]{3}             return 'HEX_COLOR';

/*Apartado de comentarios*/

"#".*           /*Ignorar comentario de linea*/

"/*"([^*]|\*+[^*/])*(\*+"/")           /*Ignorar comentario multilinea*/ 


/*------***---Reconocimiento de presets de direcciones y redondeo---***------*/


"CENTER"|"RIGHT"|"LEFT"         return 'DIRECTION';

"DOTTED"|"LINE"|"DOUBLE"         return 'MARGIN_TIPO';



/*------***---Reconocimiento de presets de tipos de fuente---***------*/


"HELVETICA"         return 'HELVETICA';

"SANS"              return 'SANS';

"SERIF"             return 'SERIF';

"MONO"              return 'MONO';

"CURSIVE"           return 'CURSIVE';


/*------***---Reconocimiento de presets de colores---***------*/


"blue"|"white"|"red"|"green"|"violet"|"gray"|"black"|"lightgray"    return 'COLOR_PRESET';


/*------***--- Reconocimiento de palabras reservadas de direcciones---***------*/

"top"|"bottom"|"left"|"right"       return 'POSITION';


/*------***--- Reconocimiento de palabras reservadas de configuracion general---***------*/

"rgb"                               return 'RGB';

"text"                              return 'TEXT';

"align"                             return 'ALIGN';

"size"                              return 'SIZE';

"font"                              return 'FONT';

"padding"                           return 'PADDING';

"margin"                            return 'MARGIN';

"border"                            return 'BORDER';

"style"                             return 'STYLE';

"radius"                            return 'RADIUS';


/*------***--- Reconocimiento de palabras reservadas de configuracion---***------*/

"height"                            return 'HEIGHT';

"width"                             return 'WIDTH';

"min-height"                        return 'MIN_HEIGHT';

"min-width"                         return 'MIN_WIDTH';

"max-height"                        return 'MAX_HEIGHT';

"max-width"                         return 'MAX_WIDTH';

/*------***--- Reconocimiento de palabras reservadas de configuracion de colores---***------*/

"background"                        return 'BACKGROUND';

"color"                             return 'COLOR';

/*------***---Reconocimiento de operadores de comparacion---***------*/

">="                        return 'MAYOR_IGUAL';

"<="                        return 'MENOR_IGUAL';

">"                         return 'MAYOR';

"<"                         return 'MENOR';

"=="                        return 'IGUALACION';

"!="                        return 'DIFERENTE';

/*------***--- Reconocimiento de caracteres especiales---***------*/

","                         return 'COMA';

";"                         return 'PUNTO_COMA';

"{"                         return 'LLAVE_APERTURA';

"}"                         return 'LLAVE_CIERRE';

"("                         return 'PARENT_APERTURA';

")"                         return 'PARENT_CIERRE';

"="                         return 'IGUAL';

/*------***--- Reconocimiento de operadores matematicos---***------*/

"+"                     return 'MAS';

"-"                     return 'MENOS';

"*"                     return 'MULTIPLICACION';

"/"                     return 'DIVISION';

/*---Caracter especial para indicar espacio----*/

"%"                     return 'PORCENTAJE';



/*------***---Reconocimiento de operadores logicos---***------*/

"||"                            return 'OR';

"&&"                            return 'AND';

"!"                             return 'NOT';

/*------***--- Reconocimiento de palabras reservadas del lenguaje---***------*/

"extends"                   return 'EXTENDS';

"@for"                      return 'FOR';

"from"                      return 'FROM';              

"through"                   return 'THROUGH';    

"to"                        return 'TO';    


/*------***--- Reconocimiento de numeros decimales y enteros---***------*/

[0-9]+(\.[0-9]+)?\b             return 'NUMERO';



/*------***--- Reconocimiento de variables---***------*/

"$"[a-zA-Z_][a-zA-Z0-9_-]*      return 'VARIABLE_DOLAR';


[a-zA-Z_][a-zA-Z0-9_-]*         return 'IDENTIFICADOR';


.                           {
                                if (!yy.errores) yy.errores = [];
                                
                                yy.errores.push({
                                    lexema: yytext,
                                    tipo: "Lexico",
                                    fila: yylloc.first_line,
                                    columna: yylloc.first_column + 1,
                                    descripcion: "Caracter no valido en el lenguaje .styles"
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
        "MAS": "'+'",
        "MENOS": "'-'",
        "MULTIPLICACION": "'*'",
        "DIVISION": "'/'",
        "PORCENTAJE": "'%'",
        "FOR": "'@for'",
        "THROUGH": "through",
        "IGUAL": "'='",
        "FROM": "from",
        "TO": "to",
        "EXTENDS": "extends",
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
%left 'MULTIPLICACION' 'DIVISION' 'PORCENTAJE'

%right 'NOT' 'UMENOS'

/*----Simbolo inicial----*/

%start inicio

%%

/*-----=====-----Produccion principal de inicio-----=====-----*/

inicio  : definicion_estilos  EOF 
        { 
            return $1; 
        }
        | error EOF 
        {
            reportarError(yy, {
                descripcion: 'Error en la estructura del archivo de estilos',
                loc: @1,
                texto: yytext
            });

            return null; 
        }
        ;

/*-----=====-----Produccion para la definicion del lenguaje de estilos .styles-----=====-----*/

definicion_estilos      : definicion_estilos cuerpo
                        {{
                            $1.push($2);
                            $$  = $1;
                        }}
                        | cuerpo
                        {{
                            $$ = [$1];
                        }}
                        ;

/*-----=====-----Produccion del cuerpo general de cuerpo de estilos-----=====-----*/

cuerpo      : clase
            {{
                $$  = $1;
            }}
            | declaracion_for
            {{
                $$  = $1;
            }}
            ;


/*-----=====-----Produccion del cuerpo general de ciclos for-----=====-----*/

declaracion_for         : FOR VARIABLE_DOLAR FROM expresion_ciclos THROUGH expresion_ciclos LLAVE_APERTURA cuerpo_for LLAVE_CIERRE
                        {{
                            $$ = {
                                tipo: 'CICLO_FOR',
                                inclusivo: true,
                                variable: $2,
                                inicio: $4,
                                fin: $6,
                                cuerpo: $8,
                                loc_linea: @1.first_line, 
                                loc_columna: @1.first_column + 1
                            };
                        }}
                        | FOR VARIABLE_DOLAR FROM expresion_ciclos TO expresion_ciclos LLAVE_APERTURA cuerpo_for LLAVE_CIERRE
                        {{
                            $$ = {
                                tipo: 'CICLO_FOR',
                                inclusivo: false,     
                                variable: $2,
                                inicio: $4,
                                fin: $6,
                                cuerpo: $8,
                                loc_linea: @1.first_line, 
                                loc_columna: @1.first_column + 1
                            };
                        }}
                        ;   


/*-----=====-----Produccion del cuerpo que pueden contener los ciclos for-----=====-----*/

cuerpo_for              : cuerpo_for declaracion_for_estilo
                        {{
                            $1.push($2); 
                            $$ = $1;
                        }}
                        | declaracion_for_estilo
                        {{
                            $$ = [$1];
                        }}
                        ;


/*-----=====-----Produccion del cuerpo de una variable dinamica con sus caracteristicas-----=====-----*/

declaracion_for_estilo      : selector_dinamico LLAVE_APERTURA cuerpo_declaracion_for LLAVE_CIERRE
                            {{
                                $$ = {
                                    tipo: 'DEC_ESTILO_DINAMICO',
                                    selector: $1,
                                    parent: null,       
                                    propiedades: $3,
                                    loc_linea: @1.first_line, 
                                    loc_columna: @1.first_column + 1     
                                };
                            }}
                            | selector_dinamico EXTENDS selector_dinamico LLAVE_APERTURA cuerpo_declaracion_for LLAVE_CIERRE
                            {{
                                $$ = {
                                    tipo: 'DEC_ESTILO_NORMAL',
                                    selector: $1,
                                    parent: $3,       
                                    propiedades: $5,
                                    loc_linea: @1.first_line, 
                                    loc_columna: @1.first_column + 1     
                                };
                            }}
                            ;

/*-----=====-----Produccion del interior de una variable de estilos dentro de un ciclo for-----=====-----*/

cuerpo_declaracion_for      : cuerpo_declaracion_for propiedad_estilo_for
                            {{
                                $1.push($2);
                                $$ = $1;
                            }}
                            | propiedad_estilo_for
                            {{
                                $$ = [$1];
                            }}
                            | cuerpo_declaracion_for error PUNTO_COMA
                            {{
                                reportarError(yy, {
                                    descripcion: 'Error de sintaxis en la propiedad de estilo del @for. Cerca del punto y coma.',
                                    loc: @2,
                                    texto: yytext
                                });
                                $$ = $1;
                            }}
                            | error PUNTO_COMA
                            {{
                                reportarError(yy, {
                                    descripcion: 'Error de sintaxis en el primer estilo del @for. Cerca del punto y coma.',
                                    loc: @1,
                                    texto: yytext
                                });
                                $$ = [];
                            }}
                            ;

/*-----=====-----Producciones de todas las opciones que hay de estilos dentro de un for-----=====-----*/

propiedad_estilo_for            : HEIGHT IGUAL expresion_ciclica PUNTO_COMA
                                {{
                                    $$ = { 
                                        tipo: 'PROPIEDAD_ESTILO', 
                                        nombre: 'height', 
                                        valor: $3,
                                        loc_linea: @1.first_line, 
                                        loc_columna: @1.first_column + 1
                                    };
                                }}
                                | WIDTH IGUAL expresion_ciclica PUNTO_COMA
                                {{
                                    $$ = { 
                                        tipo: 'PROPIEDAD_ESTILO', 
                                        nombre: 'width', 
                                        valor: $3,
                                        loc_linea: @1.first_line, 
                                        loc_columna: @1.first_column + 1
                                    };
                                }}
                                | MIN_WIDTH IGUAL expresion_ciclica PUNTO_COMA
                                {{
                                    $$ = { 
                                        tipo: 'PROPIEDAD_ESTILO', 
                                        nombre: 'min-width', 
                                        valor: $3,
                                        loc_linea: @1.first_line, 
                                        loc_columna: @1.first_column + 1
                                    };
                                }}
                                | MAX_WIDTH IGUAL expresion_ciclica PUNTO_COMA
                                {{
                                    $$ = { 
                                        tipo: 'PROPIEDAD_ESTILO', 
                                        nombre: 'max-width', 
                                        valor: $3,
                                        loc_linea: @1.first_line, 
                                        loc_columna: @1.first_column + 1 
                                    };
                                }}
                                | MIN_HEIGHT IGUAL expresion_ciclica PUNTO_COMA
                                {{
                                    $$ = { 
                                        tipo: 'PROPIEDAD_ESTILO', 
                                        nombre: 'min-height', 
                                        valor: $3,
                                        loc_linea: @1.first_line, 
                                        loc_columna: @1.first_column + 1 
                                    };
                                }}
                                | MAX_HEIGHT IGUAL expresion_ciclica PUNTO_COMA
                                {{
                                    $$ = { 
                                        tipo: 'PROPIEDAD_ESTILO', 
                                        nombre: 'max-height', 
                                        valor: $3,
                                        loc_linea: @1.first_line, 
                                        loc_columna: @1.first_column + 1
                                    };
                                }}
                                | TEXT SIZE IGUAL expresion_ciclica PUNTO_COMA
                                {{
                                    $$ = { 
                                        tipo: 'PROPIEDAD_ESTILO', 
                                        nombre: 'font-size', 
                                        valor: $4,
                                        loc_linea: @1.first_line, 
                                        loc_columna: @1.first_column + 1
                                    };
                                }}
                                | TEXT ALIGN IGUAL DIRECTION PUNTO_COMA
                                {{
                                    $$ = { 
                                        tipo: 'PROPIEDAD_ESTILO', 
                                        nombre: 'text-align', 
                                        valor: { 
                                            tipo: 'VALOR_LITERAL', 
                                            valor: $4 
                                        },
                                        loc_linea: @1.first_line, 
                                        loc_columna: @1.first_column + 1
                                    };
                                }}
                                | TEXT FONT IGUAL fuente_estilo PUNTO_COMA
                                {{
                                    $$ = { 
                                        tipo: 'PROPIEDAD_ESTILO', 
                                        nombre: 'font-family', 
                                        valor: { 
                                            tipo: 'VALOR_LITERAL', 
                                            valor: $4 
                                        },
                                        loc_linea: @1.first_line, 
                                        loc_columna: @1.first_column + 1
                                    };
                                }}
                                | BACKGROUND COLOR IGUAL color_config_for PUNTO_COMA
                                {{
                                    $$ = { 
                                        tipo: 'PROPIEDAD_ESTILO', 
                                        nombre: 'background-color', 
                                        valor: $4,
                                        loc_linea: @1.first_line, 
                                        loc_columna: @1.first_column + 1
                                    };
                                }}
                                | COLOR IGUAL color_config_for PUNTO_COMA
                                {{
                                    $$ = { 
                                        tipo: 'PROPIEDAD_ESTILO', 
                                        nombre: 'color', 
                                        valor: $3,
                                        loc_linea: @1.first_line, 
                                        loc_columna: @1.first_column + 1 
                                    };
                                }}
                                | MARGIN IGUAL expresion_ciclica PUNTO_COMA
                                {{
                                    $$ = { 
                                        tipo: 'PROPIEDAD_ESTILO', 
                                        nombre: 'margin', 
                                        valor: $3,
                                        loc_linea: @1.first_line, 
                                        loc_columna: @1.first_column + 1 
                                    };
                                }}
                                | MARGIN POSITION IGUAL expresion_ciclica PUNTO_COMA
                                {{
                                    $$ = { 
                                        tipo: 'PROPIEDAD_ESTILO', 
                                        nombre: 'margin-' + $2.toLowerCase(), 
                                        valor: $4,
                                        loc_linea: @1.first_line, 
                                        loc_columna: @1.first_column + 1 
                                    };
                                }}
                                | PADDING IGUAL expresion_ciclica PUNTO_COMA
                                {{
                                    $$ = { 
                                        tipo: 'PROPIEDAD_ESTILO', 
                                        nombre: 'padding', 
                                        valor: $3,
                                        loc_linea: @1.first_line, 
                                        loc_columna: @1.first_column + 1
                                    };
                                }}
                                | PADDING POSITION IGUAL expresion_ciclica PUNTO_COMA
                                {{
                                    $$ = { 
                                        tipo: 'PROPIEDAD_ESTILO', 
                                        nombre: 'padding-' + $2.toLowerCase(), 
                                        valor: $4,
                                        loc_linea: @1.first_line, 
                                        loc_columna: @1.first_column + 1 
                                    };
                                }}
                                | BORDER RADIUS IGUAL expresion_ciclica PUNTO_COMA
                                {{
                                    $$ = { 
                                        tipo: 'PROPIEDAD_ESTILO', 
                                        nombre: 'border-radius', 
                                        valor: $4,
                                        loc_linea: @1.first_line, 
                                        loc_columna: @1.first_column + 1 
                                    };
                                }}
                                | BORDER STYLE IGUAL MARGIN_TIPO PUNTO_COMA
                                {{
                                    $$ = { 
                                        tipo: 'PROPIEDAD_ESTILO', 
                                        nombre: 'border-style', 
                                        valor: { 
                                            tipo: 'VALOR_LITERAL', 
                                            valor: $4 
                                        },
                                        loc_linea: @1.first_line, 
                                        loc_columna: @1.first_column + 1
                                    };
                                }}
                                | BORDER WIDTH IGUAL expresion_ciclica PUNTO_COMA
                                {{
                                    $$ = { 
                                        tipo: 'PROPIEDAD_ESTILO', 
                                        nombre: 'border-width', 
                                        valor: $4,
                                        loc_linea: @1.first_line, 
                                        loc_columna: @1.first_column + 1
                                    };
                                }}
                                | BORDER COLOR IGUAL color_config_for PUNTO_COMA
                                {{
                                    $$ = { 
                                        tipo: 'PROPIEDAD_ESTILO', 
                                        nombre: 'border-color', 
                                        valor: $4,
                                        loc_linea: @1.first_line, 
                                        loc_columna: @1.first_column + 1
                                    };
                                }}
                                | BORDER IGUAL expresion_ciclica MARGIN_TIPO color_config_for PUNTO_COMA
                                {{
                                    $$ = {
                                        tipo: 'PROPIEDAD_COMPUESTA',
                                        nombre: 'border',
                                        ancho: $3,   
                                        estilo: $4,  
                                        color: $5,
                                        loc_linea: @1.first_line, 
                                        loc_columna: @1.first_column + 1   
                                    };
                                }}
                                | BORDER POSITION STYLE IGUAL MARGIN_TIPO PUNTO_COMA
                                {{
                                    $$ = { 
                                        tipo: 'PROPIEDAD_ESTILO', 
                                        nombre: `border-${$2.toLowerCase()}-style`,
                                        valor: { 
                                            tipo: 'VALOR_LITERAL', 
                                            valor: $5 
                                        },
                                        loc_linea: @1.first_line, 
                                        loc_columna: @1.first_column + 1 
                                    };
                                }}
                                | BORDER POSITION IGUAL expresion_ciclica MARGIN_TIPO color_config_for PUNTO_COMA
                                {{
                                    $$ = {
                                        tipo: 'PROPIEDAD_COMPUESTA',
                                        nombre: `border-${$2.toLowerCase()}`,
                                        ancho: $4,
                                        estilo: $5,
                                        color: $6,
                                        loc_linea: @1.first_line, 
                                        loc_columna: @1.first_column + 1
                                    };
                                }}
                                ;               

/*-----=====-----Producciones para definir los colores dentro de un for-----=====-----*/

color_config_for        : RGB PARENT_APERTURA expresion_ciclos COMA expresion_ciclos COMA expresion_ciclos PARENT_CIERRE
                        {{
                            $$ = {
                                tipo: 'COLOR_RGB',
                                r: $3, 
                                g: $5, 
                                b: $7,
                                loc_linea: @1.first_line, 
                                loc_columna: @1.first_column + 1
                            };
                        }}
                        | HEX_COLOR
                        {{
                            $$ = {
                                tipo: 'VALOR_LITERAL',
                                subtipo: 'COLOR_HEX',
                                valor: $1,
                                loc_linea: @1.first_line, 
                                loc_columna: @1.first_column + 1
                            };
                        }}
                        | COLOR_PRESET
                        {{
                            $$ = {
                                tipo: 'VALOR_LITERAL',
                                subtipo: 'COLOR_PRESET',
                                valor: $1,
                                loc_linea: @1.first_line, 
                                loc_columna: @1.first_column + 1
                            };

                        }}
                        ;

/*-----=====-----Produccion de los identificadores que puede tener el cuerpo for (Arreglo de variables)-----=====-----*/

selector_dinamico       : lista_partes_selector
                        {{
                            $$ = { 
                                tipo: 'IDENTIFICADOR_DINAMICO', 
                                partes: $1,
                                loc_linea: @1.first_line, 
                                loc_columna: @1.first_column + 1 
                            }; 
                        }}
                        ;

/*-----=====-----Produccion de las partes que puede tener un identificador dolar-----=====-----*/

lista_partes_selector   : lista_partes_selector parte_selector
                        {{
                            $1.push($2);
                            $$ = $1;
                        }}
                        | parte_selector
                        {{
                            $$ = [$1];
                        }}
                        ;

/*-----=====-----Produccion de las combinaciones que peude tener un identificador-----=====-----*/

parte_selector      : IDENTIFICADOR
                    {{ 
                        $$ = { 
                            tipo: 'TEXTO', 
                            valor: $1,
                            loc_linea: @1.first_line, 
                            loc_columna: @1.first_column + 1 
                        }; 
                    }}
                    | VARIABLE_DOLAR
                    {{ 
                        $$ = { 
                            tipo: 'VARIABLE_REF',  
                            nombre: $1,
                            loc_linea: @1.first_line, 
                            loc_columna: @1.first_column + 1  
                        }; 
                    }}
                    | NUMERO
                    {{ 
                        $$ = { 
                            tipo: 'TEXTO', 
                            valor: $1,
                            loc_linea: @1.first_line, 
                            loc_columna: @1.first_column + 1 
                        }; 
                    }}
                    | MENOS
                    {{ 
                        $$ = { 
                            tipo: 'TEXTO', 
                            valor: '-',
                            loc_linea: @1.first_line, 
                            loc_columna: @1.first_column + 1  
                        }; 
                    }}
                    ;


/*-----=====-----Produccion de las expresiones que pueden contener definiciones de estilos dentro del ciclo for-----=====-----*/

expresion_ciclica       : expresion_ciclos
                        {{
                            $$ = {
                                tipo: 'EXPRESION_COMPUESTA',
                                expresion: $1,
                                unidad: 'px',
                                loc_linea: @1.first_line, 
                                loc_columna: @1.first_column + 1 
                            };
                        }}
                        | expresion_ciclos PORCENTAJE
                        {{
                            $$ = {
                                tipo: 'EXPRESION_COMPUESTA',
                                expresion: $1,
                                unidad: '%',
                                loc_linea: @1.first_line, 
                                loc_columna: @1.first_column + 1 
                            };
                        }}
                        ;

/*-----=====-----Produccion del cuerpo que pueden contener definiciones de expresiones especiales en el for -----=====-----*/

expresion_ciclos        : expresion_ciclos MAS expresion_ciclos
                        {{ 
                            $$ = { 
                                tipo: 'OPERACION', 
                                operador: 'SUMA', 
                                izq: $1, 
                                der: $3,
                                loc_linea: @1.first_line, 
                                loc_columna: @1.first_column + 1  
                            }; 
                        }}
                        | expresion_ciclos MENOS expresion_ciclos
                        {{ 
                            $$ = { 
                                tipo: 'OPERACION', 
                                operador: 'RESTA', 
                                izq: $1, 
                                der: $3,
                                loc_linea: @1.first_line, 
                                loc_columna: @1.first_column + 1  
                            }; 
                        }}
                        | expresion_ciclos MULTIPLICACION expresion_ciclos
                        {{ 
                            $$ = { 
                                tipo: 'OPERACION', 
                                operador: 'MULTIPLICACION', 
                                izq: $1, 
                                der: $3,
                                loc_linea: @1.first_line, 
                                loc_columna: @1.first_column + 1 
                            }; 
                        }}
                        | expresion_ciclos DIVISION expresion_ciclos
                        {{ 
                            $$ = { 
                                tipo: 'OPERACION', 
                                operador: 'DIVISION', 
                                izq: $1, 
                                der: $3,
                                loc_linea: @1.first_line, 
                                loc_columna: @1.first_column + 1 
                            }; 
                        }}
                        | expresion_ciclos PORCENTAJE expresion_ciclos
                        {{ 
                            $$ = { 
                                tipo: 'OPERACION', 
                                operador: 'MODULO', 
                                izq: $1, 
                                der: $3,
                                loc_linea: @1.first_line, 
                                loc_columna: @1.first_column + 1 
                            }; 
                        }}
                        | expresion_ciclos MAYOR expresion_ciclos
                        {{ 
                            $$ = { 
                                tipo: 'OPERACION', 
                                operador: 'MAYOR', 
                                izq: $1, 
                                der: $3,
                                loc_linea: @1.first_line, 
                                loc_columna: @1.first_column + 1  
                            }; 
                        }}
                        | expresion_ciclos MENOR expresion_ciclos
                        {{ 
                            $$ = { 
                                tipo: 'OPERACION', 
                                operador: 'MENOR', 
                                izq: $1, 
                                der: $3,
                                loc_linea: @1.first_line, 
                                loc_columna: @1.first_column + 1  
                            }; 
                        }}
                        | expresion_ciclos MAYOR_IGUAL expresion_ciclos
                        {{ 
                            $$ = { 
                                tipo: 'OPERACION', 
                                operador: 'MAYOR_IGUAL', 
                                izq: $1, 
                                der: $3,
                                loc_linea: @1.first_line, 
                                loc_columna: @1.first_column + 1  
                            }; 
                        }}
                        | expresion_ciclos MENOR_IGUAL expresion_ciclos
                        {{ 
                            $$ = { 
                                tipo: 'OPERACION', 
                                operador: 'MENOR_IGUAL', 
                                izq: $1, 
                                der: $3,
                                loc_linea: @1.first_line, 
                                loc_columna: @1.first_column + 1  
                            }; 
                        }}
                        | expresion_ciclos IGUALACION expresion_ciclos
                        {{ 
                            $$ = { 
                                tipo: 'OPERACION', 
                                operador: 'IGUALACION', 
                                izq: $1, 
                                der: $3,
                                loc_linea: @1.first_line, 
                                loc_columna: @1.first_column + 1  
                            }; 
                        }}
                        | expresion_ciclos DIFERENTE expresion_ciclos
                        {{ 
                            $$ = { 
                                tipo: 'OPERACION', 
                                operador: 'DIFERENCIA', 
                                izq: $1, 
                                der: $3,
                                loc_linea: @1.first_line, 
                                loc_columna: @1.first_column + 1  
                            }; 
                        }}
                        | expresion_ciclos OR expresion_ciclos
                        {{ 
                            $$ = { 
                                tipo: 'OPERACION', 
                                operador: 'OR', 
                                izq: $1, 
                                der: $3,
                                loc_linea: @1.first_line, 
                                loc_columna: @1.first_column + 1  
                            }; 
                        }}
                        | expresion_ciclos AND expresion_ciclos
                        {{ 
                            $$ = { 
                                tipo: 'OPERACION', 
                                operador: 'AND', 
                                izq: $1, 
                                der: $3,
                                loc_linea: @1.first_line, 
                                loc_columna: @1.first_column + 1  
                            }; 
                        }}
                        | MENOS expresion_ciclos %prec UMENOS
                        {{ 
                            $$ = { 
                                tipo: 'OPERACION_UNARIA', 
                                operador: 'MENOS_UNARIO', 
                                valor: $2,
                                loc_linea: @1.first_line, 
                                loc_columna: @1.first_column + 1 
                            }; 
                        }}
                        | NOT expresion_ciclos
                        {{ 
                            $$ = { 
                                tipo: 'OPERACION_UNARIA', 
                                operador: 'NOT', 
                                valor: $2,
                                loc_linea: @1.first_line, 
                                loc_columna: @1.first_column + 1  
                            }; 
                        }}
                        | PARENT_APERTURA expresion_ciclos PARENT_CIERRE
                        {{
                            $$ = $2; 
                        }}
                        | NUMERO
                        {{
                            $$ = { 
                                tipo: 'VALOR', 
                                valor: Number($1),
                                loc_linea: @1.first_line, 
                                loc_columna: @1.first_column + 1 
                            }; 
                        }}
                        | VARIABLE_DOLAR
                        {{ 
                            $$ = { 
                                tipo: 'VARIABLE', 
                                nombre: $1,
                                loc_linea: @1.first_line, 
                                loc_columna: @1.first_column + 1 
                            };
                        }}
                        ;

/*-----=====-----Produccion que define el cuerpo de un id utilizado-----=====-----*/

clase               : IDENTIFICADOR LLAVE_APERTURA cuerpo_propiedad LLAVE_CIERRE
                    {{
                        $$ = {
                            tipo: 'DEC_ESTILO_NORMAL',
                            selector: $1,  
                            parent: null,
                            propiedades: $3,
                            loc_linea: @1.first_line, 
                            loc_columna: @1.first_column + 1     
                        };
                    }}
                    | IDENTIFICADOR EXTENDS IDENTIFICADOR LLAVE_APERTURA cuerpo_propiedad LLAVE_CIERRE
                    {{
                        $$ = {
                            tipo: 'DEC_ESTILO_NORMAL',
                            selector: $1,
                            parent: $3,       
                            propiedades: $5,
                            loc_linea: @1.first_line, 
                            loc_columna: @1.first_column + 1     
                        };
                    }}
                    ;


/*-----=====-----Produccion del interior de una variable de estilos dentro de una clase normal----=====-----*/

cuerpo_propiedad            : cuerpo_propiedad propiedad_estilo_normal
                            {{
                                $1.push($2);
                                $$ = $1;
                            }}
                            | propiedad_estilo_normal
                            {{
                                $$ = [$1];
                            }}
                            | cuerpo_propiedad error PUNTO_COMA
                            {{
                                reportarError(yy, {
                                    descripcion: 'Error de sintaxis en la propiedad de estilo. Cerca del punto y coma.',
                                    loc: @2,
                                    texto: yytext
                                });
                                $$ = $1;
                            }}
                            | error PUNTO_COMA
                            {{
                                reportarError(yy, {
                                    descripcion: 'Error de sintaxis en la primera propiedad de estilo. Cerca del punto y coma.',
                                    loc: @1,
                                    texto: yytext
                                });
                                $$ = [];
                            }}
                            ;

/*-----=====-----Produccion de cada propiedad que puede tener una variable clase----=====-----*/

propiedad_estilo_normal         : HEIGHT IGUAL expresion_comun PUNTO_COMA
                                {{
                                    $$ = { 
                                        tipo: 'PROPIEDAD_ESTILO', 
                                        nombre: 'height', 
                                        valor: $3,
                                        loc_linea: @1.first_line, 
                                        loc_columna: @1.first_column + 1 
                                    };
                                }}
                                | WIDTH IGUAL expresion_comun PUNTO_COMA
                                {{
                                    $$ = { 
                                        tipo: 'PROPIEDAD_ESTILO', 
                                        nombre: 'width', 
                                        valor: $3,
                                        loc_linea: @1.first_line, 
                                        loc_columna: @1.first_column + 1  
                                    };
                                }}
                                | MIN_WIDTH IGUAL expresion_comun PUNTO_COMA
                                {{
                                    $$ = { 
                                        tipo: 'PROPIEDAD_ESTILO', 
                                        nombre: 'min-width', 
                                        valor: $3,
                                        loc_linea: @1.first_line, 
                                        loc_columna: @1.first_column + 1  
                                    };
                                }}
                                | MAX_WIDTH IGUAL expresion_comun PUNTO_COMA
                                {{
                                    $$ = { 
                                        tipo: 'PROPIEDAD_ESTILO', 
                                        nombre: 'max-width', 
                                        valor: $3,
                                        loc_linea: @1.first_line, 
                                        loc_columna: @1.first_column + 1  
                                    };
                                }}
                                | MIN_HEIGHT IGUAL expresion_comun PUNTO_COMA
                                {{
                                    $$ = { 
                                        tipo: 'PROPIEDAD_ESTILO', 
                                        nombre: 'min-height', 
                                        valor: $3,
                                        loc_linea: @1.first_line, 
                                        loc_columna: @1.first_column + 1  
                                    };
                                }}
                                | MAX_HEIGHT IGUAL expresion_comun PUNTO_COMA
                                {{
                                    $$ = { 
                                        tipo: 'PROPIEDAD_ESTILO', 
                                        nombre: 'max-height', 
                                        valor: $3,
                                        loc_linea: @1.first_line, 
                                        loc_columna: @1.first_column + 1  
                                    };
                                }}
                                | TEXT SIZE IGUAL expresion_comun PUNTO_COMA
                                {{
                                    $$ = { 
                                        tipo: 'PROPIEDAD_ESTILO', 
                                        nombre: 'font-size', 
                                        valor: $4,
                                        loc_linea: @1.first_line, 
                                        loc_columna: @1.first_column + 1  
                                    };
                                }}
                                | TEXT ALIGN IGUAL DIRECTION PUNTO_COMA
                                {{
                                    $$ = { 
                                        tipo: 'PROPIEDAD_ESTILO', 
                                        nombre: 'text-align', 
                                        valor: { 
                                            tipo: 'VALOR_LITERAL', 
                                            valor: $4 
                                        },
                                        loc_linea: @1.first_line, 
                                        loc_columna: @1.first_column + 1  
                                    };
                                }}
                                | TEXT FONT IGUAL fuente_estilo PUNTO_COMA
                                {{
                                    $$ = { 
                                        tipo: 'PROPIEDAD_ESTILO', 
                                        nombre: 'font-family', 
                                        valor: { 
                                            tipo: 'VALOR_LITERAL', 
                                            valor: $4 
                                        },
                                        loc_linea: @1.first_line, 
                                        loc_columna: @1.first_column + 1  
                                    };
                                }}
                                | BACKGROUND COLOR IGUAL color_config_for PUNTO_COMA
                                {{
                                    $$ = { 
                                        tipo: 'PROPIEDAD_ESTILO', 
                                        nombre: 'background-color', 
                                        valor: $4,
                                        loc_linea: @1.first_line, 
                                        loc_columna: @1.first_column + 1  
                                    };
                                }}
                                | COLOR IGUAL color_config_for PUNTO_COMA
                                {{
                                    $$ = { 
                                        tipo: 'PROPIEDAD_ESTILO', 
                                        nombre: 'color', 
                                        valor: $3,
                                        loc_linea: @1.first_line, 
                                        loc_columna: @1.first_column + 1  
                                    };
                                }}
                                | MARGIN IGUAL expresion_comun PUNTO_COMA
                                {{
                                    $$ = { 
                                        tipo: 'PROPIEDAD_ESTILO', 
                                        nombre: 'margin', 
                                        valor: $3,
                                        loc_linea: @1.first_line, 
                                        loc_columna: @1.first_column + 1  
                                    };
                                }}
                                | MARGIN POSITION IGUAL expresion_comun PUNTO_COMA
                                {{
                                    $$ = { 
                                        tipo: 'PROPIEDAD_ESTILO', 
                                        nombre: 'margin-' + $2.toLowerCase(), 
                                        valor: $4,
                                        loc_linea: @1.first_line, 
                                        loc_columna: @1.first_column + 1  
                                    };
                                }}
                                | PADDING IGUAL expresion_comun PUNTO_COMA
                                {{
                                    $$ = { 
                                        tipo: 'PROPIEDAD_ESTILO', 
                                        nombre: 'padding', 
                                        valor: $3,
                                        loc_linea: @1.first_line, 
                                        loc_columna: @1.first_column + 1  
                                    };
                                }}
                                | PADDING POSITION IGUAL expresion_comun PUNTO_COMA
                                {{
                                    $$ = { 
                                        tipo: 'PROPIEDAD_ESTILO', 
                                        nombre: 'padding-' + $2.toLowerCase(), 
                                        valor: $4,
                                        loc_linea: @1.first_line, 
                                        loc_columna: @1.first_column + 1  
                                    };
                                }}
                                | BORDER RADIUS IGUAL expresion_comun PUNTO_COMA
                                {{
                                    $$ = { 
                                        tipo: 'PROPIEDAD_ESTILO', 
                                        nombre: 'border-radius', 
                                        valor: $4,
                                        loc_linea: @1.first_line, 
                                        loc_columna: @1.first_column + 1  
                                    };
                                }}
                                | BORDER STYLE IGUAL MARGIN_TIPO PUNTO_COMA
                                {{
                                    $$ = { 
                                        tipo: 'PROPIEDAD_ESTILO', 
                                        nombre: 'border-style', 
                                        valor: { 
                                            tipo: 'VALOR_LITERAL', 
                                            valor: $4 
                                        },
                                        loc_linea: @1.first_line, 
                                        loc_columna: @1.first_column + 1  
                                    };
                                }}
                                | BORDER WIDTH IGUAL expresion_comun PUNTO_COMA
                                {{
                                    $$ = { 
                                        tipo: 'PROPIEDAD_ESTILO', 
                                        nombre: 'border-width', 
                                        valor: $4,
                                        loc_linea: @1.first_line, 
                                        loc_columna: @1.first_column + 1  
                                    };
                                }}
                                | BORDER COLOR IGUAL color_config_for PUNTO_COMA
                                {{
                                    $$ = { 
                                        tipo: 'PROPIEDAD_ESTILO', 
                                        nombre: 'border-color', 
                                        valor: $4,
                                        loc_linea: @1.first_line, 
                                        loc_columna: @1.first_column + 1  
                                    };
                                }}
                                | BORDER IGUAL expresion_comun MARGIN_TIPO color_config_for PUNTO_COMA
                                {{
                                    $$ = {
                                        tipo: 'PROPIEDAD_COMPUESTA',
                                        nombre: 'border',
                                        ancho: $3,   
                                        estilo: $4,  
                                        color: $5,
                                        loc_linea: @1.first_line, 
                                        loc_columna: @1.first_column + 1     
                                    };
                                }}
                                | BORDER POSITION STYLE IGUAL MARGIN_TIPO PUNTO_COMA
                                {{
                                    $$ = { 
                                        tipo: 'PROPIEDAD_ESTILO', 
                                        nombre: `border-${$2.toLowerCase()}-style`,
                                        valor: { 
                                            tipo: 'VALOR_LITERAL', 
                                            valor: $5 
                                        },
                                        loc_linea: @1.first_line, 
                                        loc_columna: @1.first_column + 1  
                                    };
                                }}
                                | BORDER POSITION IGUAL expresion_comun MARGIN_TIPO color_config_for PUNTO_COMA
                                {{
                                    $$ = {
                                        tipo: 'PROPIEDAD_COMPUESTA',
                                        nombre: `border-${$2.toLowerCase()}`,
                                        ancho: $4,
                                        estilo: $5,
                                        color: $6,
                                        loc_linea: @1.first_line, 
                                        loc_columna: @1.first_column + 1 
                                    };
                                }}
                                ;


/*-----=====-----Produccion de las expresiones que pueden contener definiciones de estilos-----=====-----*/

expresion_comun         : expresion_normal
                        {{
                            $$ = {
                                tipo: 'EXPRESION_SIMPLE',
                                expresion: $1,
                                unidad: 'px',
                                loc_linea: @1.first_line, 
                                loc_columna: @1.first_column + 1 
                            };
                        }}
                        | expresion_normal PORCENTAJE
                        {{
                            $$ = {
                                tipo: 'EXPRESION_SIMPLE',
                                expresion: $1,
                                unidad: '%',
                                loc_linea: @1.first_line, 
                                loc_columna: @1.first_column + 1 
                            };
                        }}
                        ;


/*-----=====-----Produccion del cuerpo que pueden contener definiciones de expresiones lineales en estilos comunes -----=====-----*/

expresion_normal        : expresion_normal MAS expresion_normal
                        {{ 
                            $$ = { 
                                tipo: 'OPERACION', 
                                operador: 'SUMA', 
                                izq: $1, 
                                der: $3,
                                loc_linea: @1.first_line, 
                                loc_columna: @1.first_column + 1  
                            }; 
                        }}
                        | expresion_normal MENOS expresion_normal
                        {{ 
                            $$ = { 
                                tipo: 'OPERACION', 
                                operador: 'RESTA', 
                                izq: $1, 
                                der: $3,
                                loc_linea: @1.first_line, 
                                loc_columna: @1.first_column + 1  
                            }; 
                        }}
                        | expresion_normal MULTIPLICACION expresion_normal
                        {{ 
                            $$ = { 
                                tipo: 'OPERACION', 
                                operador: 'MULTIPLICACION', 
                                izq: $1, 
                                der: $3,
                                loc_linea: @1.first_line, 
                                loc_columna: @1.first_column + 1  
                            }; 
                        }}
                        | expresion_normal DIVISION expresion_normal
                        {{ 
                            $$ = { 
                                tipo: 'OPERACION', 
                                operador: 'DIVISION', 
                                izq: $1, 
                                der: $3,
                                loc_linea: @1.first_line, 
                                loc_columna: @1.first_column + 1  
                            }; 
                        }}
                        | expresion_normal PORCENTAJE expresion_normal
                        {{ 
                            $$ = { 
                                tipo: 'OPERACION', 
                                operador: 'MODULO', 
                                izq: $1, 
                                der: $3,
                                loc_linea: @1.first_line, 
                                loc_columna: @1.first_column + 1  
                            }; 
                        }}
                        | expresion_normal MAYOR expresion_normal
                        {{ 
                            $$ = { 
                                tipo: 'OPERACION', 
                                operador: 'MAYOR', 
                                izq: $1, 
                                der: $3,
                                loc_linea: @1.first_line, 
                                loc_columna: @1.first_column + 1  
                            }; 
                        }}
                        | expresion_normal MENOR expresion_normal
                        {{ 
                            $$ = { 
                                tipo: 'OPERACION', 
                                operador: 'MENOR', 
                                izq: $1, 
                                der: $3,
                                loc_linea: @1.first_line, 
                                loc_columna: @1.first_column + 1  
                            }; 
                        }}
                        | expresion_normal MAYOR_IGUAL expresion_normal
                        {{ 
                            $$ = { 
                                tipo: 'OPERACION', 
                                operador: 'MAYOR_IGUAL', 
                                izq: $1, 
                                der: $3,
                                loc_linea: @1.first_line, 
                                loc_columna: @1.first_column + 1  
                            }; 
                        }}
                        | expresion_normal MENOR_IGUAL expresion_normal
                        {{ 
                            $$ = { 
                                tipo: 'OPERACION', 
                                operador: 'MENOR_IGUAL', 
                                izq: $1, 
                                der: $3,
                                loc_linea: @1.first_line, 
                                loc_columna: @1.first_column + 1  
                            }; 
                        }}
                        | expresion_normal IGUALACION expresion_normal
                        {{ 
                            $$ = { 
                                tipo: 'OPERACION', 
                                operador: 'IGUALACION', 
                                izq: $1, 
                                der: $3,
                                loc_linea: @1.first_line, 
                                loc_columna: @1.first_column + 1  
                            }; 
                        }}
                        | expresion_normal DIFERENTE expresion_normal
                        {{ 
                            $$ = { 
                                tipo: 'OPERACION', 
                                operador: 'DIFERENCIA', 
                                izq: $1, 
                                der: $3,
                                loc_linea: @1.first_line, 
                                loc_columna: @1.first_column + 1  
                            }; 
                        }}
                        | expresion_normal OR expresion_normal
                        {{ 
                            $$ = { 
                                tipo: 'OPERACION', 
                                operador: 'OR', 
                                izq: $1, 
                                der: $3,
                                loc_linea: @1.first_line, 
                                loc_columna: @1.first_column + 1  
                            }; 
                        }}
                        | expresion_normal AND expresion_normal
                        {{ 
                            $$ = { 
                                tipo: 'OPERACION', 
                                operador: 'AND', 
                                izq: $1, 
                                der: $3,
                                loc_linea: @1.first_line, 
                                loc_columna: @1.first_column + 1  
                            }; 
                        }}
                        | MENOS expresion_normal %prec UMENOS
                        {{ 
                            $$ = { 
                                tipo: 'OPERACION_UNARIA', 
                                operador: 'MENOS_UNARIO', 
                                valor: $2,
                                loc_linea: @1.first_line, 
                                loc_columna: @1.first_column + 1  
                            }; 
                        }}
                        | NOT expresion_normal
                        {{ 
                            $$ = { 
                                tipo: 'OPERACION_UNARIA', 
                                operador: 'NOT', 
                                valor: $2,
                                loc_linea: @1.first_line, 
                                loc_columna: @1.first_column + 1  
                            }; 
                        }}
                        | PARENT_APERTURA expresion_normal PARENT_CIERRE
                        {{
                            $$ = $2; 
                        }}
                        | NUMERO
                        {{
                            $$ = { 
                                tipo: 'VALOR', 
                                valor: Number($1),
                                loc_linea: @1.first_line, 
                                loc_columna: @1.first_column + 1  
                            }; 
                        }}
                        ;


/*-----=====-----Producciones para definir las tipografias-----=====-----*/

fuente_estilo       : HELVETICA
                    {{
                        $$ = "Helvetica";
                    }}
                    | SANS SERIF
                    {{
                        $$ = "sans-serif";
                    }}
                    | SANS
                    {{
                        $$ = "sans-serif";
                    }}
                    | SERIF
                    {{
                        $$ = "serif";
                    }}
                    | CURSIVE
                    {{
                        $$ = "cursive";
                    }}
                    | MONO
                    {{
                        $$ = "monospace";
                    }}
                    ;