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

"default"                       return 'DEFAULT';

"do"                            return 'DO';

/*------***---Reconocimiento de operadores aritmeticos---***------*/

"+"                     return 'MAS';

"-"                     return 'MENOS';

"*"                     return 'MULTIPLICACION';

"/"                     return 'DIVISION';

"%"                     return 'PORCENTAJE';


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

%%


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


cuerpo_lenguaje             : IMPORT cadena_texto PUNTO_COMA
                            {{
                                $$ = {
                                    tipo: 'INSTRUCCION_IMPORT',
                                    ruta: $2, 
                                    linea: @1.first_line,
                                    columna: @1.first_column + 1
                                };
                            }}
                            | tipo_variable IDENTIFICADOR IGUAL expresion_logica PUNTO_COMA
                            {{
                                $$ = {
                                    tipo: 'DECLARACION_VARIABLE',
                                    ruta: $2, 
                                    linea: @1.first_line,
                                    columna: @1.first_column + 1
                                };
                            }}
                            ;


/*-----=====-----Produccion principal para los valores que pueden adoptar las variables .y-----=====-----*/


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
                            | exp_multiplicativa
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
                                | exp_unaria
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
                        ;

/*-----=====-----Produccion que define los textos concatenados .y-----=====-----*/

contenido_cadena        : contenido_cadena TEXTO_PLANO
                        {{
                            $$ = $1 + $2; 
                        }}
                        | /* vacio */
                        {{
                            $$ = ""; /
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
