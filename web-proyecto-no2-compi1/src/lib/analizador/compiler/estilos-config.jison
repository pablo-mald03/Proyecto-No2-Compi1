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


/*------***---Reconocimiento de presets de direcciones---***------*/


"CENTER"|"RIGHT"|"LEFT"         return 'DIRECTION';


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

"solid"                             return 'SOLID';

/*------***--- Reconocimiento de palabras reservadas de configuracion de colores---***------*/

"background"                        return 'BACKGROUND';

"color"                             return 'COLOR';

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
                                    descripcion: "Caracter no valido en el lenguaje"
                                });
                            }


<<EOF>>                         return 'EOF';

/lex

/*---****===== Seccion del analizador Sintactico =====****---*/

%{
    /* Diccionario para traducir tokens técnicos a nombres amigables */
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
        "PUNTO_COMA": "';'",
        "FOR": "'@for'",
        "THROUGH": "through",
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
%left 'MAS' 'MENOS'
%left 'MULTIPLICACION' 'DIVISION' 'PORCENTAJE'
%right UMENOS 
%left UMAS

/*----Simbolo inicial----*/

%start inicio

%%

/*-----=====-----Produccion principal de inicio-----=====-----*/

inicio  : definicion_estilos  EOF 
        { 
            return $3; 
        }
        | error EOF 
        {
            reportarError(yy, {
                descripcion: 'Error en la estructura de la hoja de estilos',
                loc: @1,
                texto: yytext
            });

            return null; 
        }
        ;

/*-----=====-----Produccion para la definicion de estilos-----=====-----*/

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

cuerpo      : declaracion_estilo
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
                                cuerpo: $8
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
                                cuerpo: $8
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
                                        propiedades: $3     
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
                            ;

/*-----=====-----Producciones de todas las opciones que hay de estilos dentro de un for-----=====-----*/

propiedad_estilo_for      : HEIGHT IGUAL expresion_ciclos PUNTO_COMA
                            {{
                                $$ = {
                                        tipo: 'PROPIEDAD_ESTILO',
                                        nombre: 'height',
                                        valor: { 
                                            tipo: 'OPERACION', 
                                            valor: $3 
                                        }
                                };
                            }}
                            | WIDTH IGUAL expresion_ciclos PUNTO_COMA
                            {{
                                $$ = {
                                        tipo: 'PROPIEDAD_ESTILO',
                                        nombre: 'width',
                                        valor: { 
                                            tipo: 'OPERACION', 
                                            valor: $3 
                                        }
                                };

                            }}
                            | MIN_WIDTH IGUAL expresion_ciclos PUNTO_COMA
                            {{
                                $$ = {
                                    tipo: 'PROPIEDAD_ESTILO',
                                    nombre: 'min-width',
                                    valor: { 
                                        tipo: 'OPERACION', 
                                        valor: $3 
                                    }
                                };
                            }}
                            | MAX_WIDTH IGUAL expresion_ciclos PUNTO_COMA
                            {{
                                $$ = {
                                    tipo: 'PROPIEDAD_ESTILO',
                                    nombre: 'max-width',
                                    valor: { 
                                        tipo: 'OPERACION', 
                                        valor: $3 
                                    }
                                };
                            }}
                            | MIN_HEIGHT IGUAL expresion_ciclos PUNTO_COMA
                            {{
                                $$ = {
                                    tipo: 'PROPIEDAD_ESTILO',
                                    nombre: 'min-height',
                                    valor: { 
                                        tipo: 'OPERACION', 
                                        valor: $3 
                                    }
                                };
                            }}
                            | MAX_HEIGHT IGUAL expresion_ciclos PUNTO_COMA
                            {{
                                $$ = {
                                    tipo: 'PROPIEDAD_ESTILO',
                                    nombre: 'max-height',
                                    valor: { 
                                        tipo: 'OPERACION', 
                                        valor: $3 
                                    }
                                };
                            }}
                            | TEXT SIZE IGUAL expresion_ciclos PUNTO_COMA
                            {{
                                $$ = {
                                    tipo: 'PROPIEDAD_ESTILO',
                                    nombre: 'text-size',
                                    valor: { 
                                        tipo: 'OPERACION', 
                                        valor: $4 
                                    }
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
                                    }
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
                                    } 
                                };
                            }}
                            | BACKGROUND COLOR IGUAL color_config_for PUNTO_COMA
                            {{
                               
                            }}
                            | COLOR IGUAL color_config_for PUNTO_COMA
                            {{
                               
                            }}
                            ;


/*-----=====-----Producciones para definir los colores dentro de un for-----=====-----*/

color_config_for        : RGB PARENT_APERTURA expresion_ciclos COMA expresion_ciclos COMA expresion_ciclos PARENT_CIERRE
                        {{
                            
                        }}
                        | HEX_COLOR
                        {{

                        }}
                        | COLOR_PRESET
                        {{

                        }}
                        ;

/*-----=====-----Produccion de los identificadores que puede tener el cuerpo for (Arreglo de variables)-----=====-----*/

selector_dinamico       : lista_partes_selector
                        {{
                            $$ = { 
                                tipo: 'IDENTIFICADOR_DINAMICO', 
                                partes: $1 
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
                            valor: $1 
                        }; 
                    }}
                    | VARIABLE_DOLAR
                    {{ 
                        $$ = { 
                            tipo: 'VARIABLE
                            _REF', nombre: $1 
                        }; 
                    }}
                    | NUMERO
                    {{ 
                        $$ = { 
                            tipo: 'TEXTO', 
                            valor: $1 
                        }; 
                    }}
                    | MENOS
                    {{ 
                        $$ = { 
                            tipo: 'TEXTO', 
                            valor: '-' 
                        }; 
                    }}
                    ;


/*-----=====-----Produccion del cuerpo que pueden contener definiciones de expresiones especiales en el for -----=====-----*/

expresion_ciclos        : expresion_ciclos MAS expresion_ciclos
                        {{ 
                            $$ = { 
                                tipo: 'OPERACION', 
                                operador: '+', 
                                izq: $1, der: $3 
                            }; 
                        }}
                        | expresion_ciclos MENOS expresion_ciclos
                        {{ 
                            $$ = { 
                                tipo: 'OPERACION', 
                                operador: '-', 
                                izq: $1, der: $3 
                            }; 
                        }}
                        | expresion_ciclos MULTIPLICACION expresion_ciclos
                        {{ 
                            $$ = { 
                                tipo: 'OPERACION', 
                                operador: '*', 
                                izq: $1, der: $3 
                            }; 
                        }}
                        | expresion_ciclos DIVISION expresion_ciclos
                        {{ 
                            $$ = { 
                                tipo: 'OPERACION', 
                                operador: '/', 
                                izq: $1, der: $3 
                            }; 
                        }}
                        | expresion_ciclos PORCENTAJE expresion_ciclos
                        {{ 
                            $$ = { 
                                tipo: 'OPERACION', 
                                operador: '%', 
                                izq: $1, der: $3 
                            }; 
                        }}
                        | MENOS expresion_ciclos %prec UMENOS
                        {{ 
                            $$ = { 
                                tipo: 'OPERACION_UNARIA', 
                                operador: '-', 
                                valor: $2 
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
                                valor: Number($1) 
                            }; 
                        }}
                        | VARIABLE_DOLAR
                        {{ 
                            $$ = { 
                                tipo: 'VARIABLE', 
                                nombre: $1 
                            };
                        }}
                        ;


/*-----=====-----Produccion del cuerpo general de estilos en variables-----=====-----*/

declaracion_estilo      : declaracion_estilo
                        {{
                            
                        }}
                        ;



/*-----=====-----Producciones para definir las tipografias-----=====-----*/

fuente_estilo       : HELVETICA
                    {{
                        $$ = $1;
                    }}
                    | SANS SERIF
                    {{
                        $$ = $1 + " " + $2;
                    }}
                    | SANS
                    {{
                        $$ = $1;
                    }}
                    | CURSIVE
                    {{
                        $$ = $1;
                    }}
                    | MONO
                    {{
                        $$ = $1;
                    }}
                    ;