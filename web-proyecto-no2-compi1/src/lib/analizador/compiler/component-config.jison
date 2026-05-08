/* Seccion analizador Lexico */

%lex
%options ranges yylineno

%x string
%s interp

%%

/*Espacios y saltos de linea*/

\s+                   /* ignorar espacios */

[\u200B\uFEFF\u200E\u200F\u202A-\u202E]+ /* Ignorar caracteres basura */

/*Apartado de comentarios*/

"#".*           /*Ignorar comentario de linea*/

"/*"([^*]|\*+[^*/])*(\*+"/")           /*Ignorar comentario multilinea*/


/*------***---Reconocimiento de tipos de variables---***------*/

"int"                           return 'INT';

"float"                         return 'FLOAT';

"string"                        return 'STRING';

"boolean"                       return 'BOOLEAN';

"char"                          return 'CHAR';

"function"                      return 'FUNCTION';

/*------***---Reconocimiento de propiedades de componentes---***------*/

"label"                         return 'LABEL';

"id"                            return 'ID';

"value"                         return 'VALUE';

/*------***---Reconocimiento de valores de propiedades---***------*/

"true"                          return 'TRUE';

"false"                         return 'FALSE';

/*------***---Reconocimiento de componentes---***------*/

"T"                             return 'TEXT';

"IMG"                           return 'IMG';

"FORM"                          return 'FORM';

"INPUT_TEXT"                    return 'INPUT_TEXT';

"INPUT_NUMBER"                  return 'INPUT_NUMBER';

"INPUT_BOOL"                    return 'INPUT_BOOL';

"SUBMIT"                        return 'SUBMIT';


/*------***---Reconocimiento de palabras reservadas del lenguaje---***------*/

"for"                         return 'FOR';

"each"                        return 'EACH';

"track"                       return 'TRACK';

"empty"                       return 'EMPTY';

"if"                          return 'IF';

"else"                        return 'ELSE';

"Switch"                      return 'SWITCH';

"case"                        return 'CASE';

"default"                     return 'DEFAULT';

/*------***---Reconocimiento de caracteres especiales del lenguaje---***------*/

","                         return 'COMA';

":"                         return 'DOS_PUNTOS';

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

"{"                         return 'LLAVE_APERTURA';

"}"                         return 'LLAVE_CIERRE';

"[["                        return 'CORCHETE_DOBLE_APERTURA';

"]]"                        return 'CORCHETE_DOBLE_CIERRE';

"["                         return 'CORCHETE_APERTURA';

"]"                         return 'CORCHETE_CIERRE';


/*------***--- MANEJO DE STRINGS y expresiones dentro de ellos---***------*/


"\""                            { this.pushState('string'); return 'COMILLA'; }

<string>"\""                    { this.popState(); return 'COMILLA'; }

<string>"$"[a-zA-Z_][a-zA-Z0-9_]* { return 'VARIABLE_DOLAR'; }

<string>"`"                     { this.pushState('interp'); return 'BACKTICK'; }

<interp>"`"                     { this.popState(); return 'BACKTICK'; }

<string>[^\"$`]+                { return 'TEXTO_CADENA'; }

<string>"$"                     { return 'TEXTO_CADENA'; }

<string>"\\\""                  { return 'TEXTO_CADENA'; }

/*------***---Reconocimiento de valores de variables---***------*/

[0-9]+"."[0-9]+\b               return 'DECIMAL';

[0-9]+\b                        return 'ENTERO';

"$"[a-zA-Z_][a-zA-Z0-9_]* return 'VARIABLE_DOLAR';

"@"[a-zA-Z][a-zA-Z0-9_]* return 'ARROBA_VAR';


[a-zA-Z][a-zA-Z0-9_-]*[a-zA-Z0-9] return 'IDENTIFICADOR';

[a-zA-Z]                          return 'IDENTIFICADOR';




.                           {
                                if (!yy.errores) yy.errores = [];
                                
                                yy.errores.push({
                                    lexema: yytext,
                                    tipo: "Lexico",
                                    fila: yylloc.first_line,
                                    columna: yylloc.first_column + 1,
                                    descripcion: "Caracter no valido en el lenguaje .comp"
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

inicio          : definicion_lenguaje  EOF 
                { 
                    return $1; 
                }
                | error EOF 
                {
                    reportarError(yy, {
                        descripcion: 'Error en la estructura del archivo de componentes',
                        loc: @1,
                        texto: yytext
                    });

                    return null; 
                }
                ;

/*-----=====-----Produccion principal de la definicion del lenguaje .comp-----=====-----*/

definicion_lenguaje : definicion_lenguaje cuerpo_lenguaje
                    {{
                        $1.push($2);
                        $$  = $1;
                    }}
                    | cuerpo_lenguaje
                    {{
                        $$ = [$1];
                    }}
                    | definicion_lenguaje error LLAVE_CIERRE
                    {{
                        reportarError(yy, {
                            descripcion: 'Error sintactico grave en el cuerpo del componente.',
                            loc: @2,
                            texto: yytext
                        });
                        $$ = $1;
                    }}
                    | error LLAVE_CIERRE
                    {{
                        reportarError(yy, {
                            descripcion: 'Error sintactico grave en la declaracion del componente.',
                            loc: @1,
                            texto: yytext
                        });
                        $$ = [];
                    }}
                    ;

/*-----=====-----Produccion principal de todo lo que puede tener un archivo .comp-----=====-----*/

cuerpo_lenguaje             : IDENTIFICADOR PARENT_APERTURA lista_parametros PARENT_CIERRE LLAVE_APERTURA listado_cuerpo LLAVE_CIERRE
                            {{
                                $$ = {
                                    tipo: 'LLAMADA_FUNCION',
                                    id: $1,
                                    parametros: $3,
                                    cuerpo: $6,       
                                    linea: @1.first_line,
                                    columna: @1.first_column + 1
                                };
                            }}
                            ;

/*-----=====-----Produccion principal de todo lo que puede tener un componente dentro-----=====-----*/

listado_cuerpo          : listado_cuerpo cuerpo_componentes
                        {{
                            $1.push($2);
                            $$  = $1;
                        }}
                        | cuerpo_componentes
                        {{
                            $$ = [$1];
                        }}
                        ;

/*-----=====-----Produccion que permite representar al cuerpo que pueden tener los componentes-----=====-----*/

cuerpo_componentes              : secciones_def
                                {{
                                    $$ = $1;
                                }}
                                | tablas_def
                                {{
                                    $$ = $1;
                                }}
                                | text_def
                                {{
                                    $$ = $1;
                                }}
                                | img_def
                                {{
                                    $$ = $1;
                                }}
                                | form_def
                                {{
                                    $$ = $1;
                                }}
                                | input_def         
                                {{ 
                                    $$ = $1; 
                                }}
                                | ciclo_for_def     
                                {{ 
                                    $$ = $1; 
                                }}
                                | condicional_if_def 
                                {{ 
                                    $$ = $1; 
                                }}
                                | condicional_switch_def
                                {{ 
                                    $$ = $1; 
                                }}
                                | componente_def
                                {{
                                    $$ = $1;
                                }}
                                | error LLAVE_CIERRE
                                {{
                                    reportarError(yy, { 
                                        descripcion: 'Error de sintaxis dentro de un bloque {}. Componente descartado.', 
                                        loc: @1, texto: yytext 
                                    });
                                    $$ = { tipo: 'NODO_ERROR', linea: @1.first_line, columna: @1.first_column + 1 };
                                }}
                                | error CORCHETE_CIERRE
                                {{
                                    reportarError(yy, { 
                                        descripcion: 'Error de sintaxis dentro de una seccion []. Componente descartado.', 
                                        loc: @1, texto: yytext 
                                    });
                                    $$ = { tipo: 'NODO_ERROR', linea: @1.first_line, columna: @1.first_column + 1 };
                                }}
                                | error CORCHETE_DOBLE_CIERRE
                                {{
                                    reportarError(yy, { 
                                        descripcion: 'Error de sintaxis dentro de una tabla o celda [[]]. Componente descartado.', 
                                        loc: @1, texto: yytext 
                                    });
                                    $$ = { tipo: 'NODO_ERROR', linea: @1.first_line, columna: @1.first_column + 1 };
                                }}
                                | error PARENT_CIERRE
                                {{
                                    reportarError(yy, { 
                                        descripcion: 'Error de sintaxis en los parametros de un componente (). Componente descartado.', 
                                        loc: @1, texto: yytext 
                                    });
                                    $$ = { tipo: 'NODO_ERROR', linea: @1.first_line, columna: @1.first_column + 1 };
                                }}
                                ;

/*-----=====-----Produccion que permite representar a un componente llamado por parametro-----=====-----*/

componente_def              : IDENTIFICADOR PARENT_APERTURA lista_argumentos_componente PARENT_CIERRE
                            {{
                                $$ = {
                                    tipo: 'COMPONENTE_PERSONALIZADO',
                                    id: $1,
                                    argumentos: $3,
                                    linea: @1.first_line,
                                    columna: @1.first_column + 1
                                };
                            }}
                            ;     
                            

/*-----=====----- Lista de argumentos para componentes personalizados -----=====-----*/

lista_argumentos_componente : lista_argumentos_componente COMA argumento_componente
                            {{
                                $1.push($3);
                                $$ = $1;
                            }}
                            | argumento_componente
                            {{
                                $$ = [$1];
                            }}
                            | /* vacio */
                            {{
                                $$ = [];
                            }}
                            ;

/*-----=====----- Argumentos de componentes personalizados -----=====-----*/

argumento_componente        : expresion_interior
                            {{
                                $$ = $1;
                            }}
                            ;


/*-----=====-----Produccion que permite representar un condicional switch dentro del componente-----=====-----*/

condicional_switch_def          : SWITCH PARENT_APERTURA expresion_interior PARENT_CIERRE LLAVE_APERTURA lista_casos LLAVE_CIERRE
                                {{
                                    $$ = {
                                        tipo: 'ESTRUCTURA_SWITCH',
                                        evalua: $3,
                                        casos: $6,
                                        linea: @1.first_line,
                                        columna: @1.first_column + 1
                                    };
                                }}
                                ;

/*-----=====-----Produccion que permite representar la lista de casos del switch-----=====-----*/

lista_casos                     : lista_casos COMA caso_def
                                {{
                                    $1.push($3);
                                    $$ = $1;
                                }}
                                | caso_def
                                {{
                                    $$ = [$1];
                                }}
                                ;

/*-----=====-----Produccion que permite representar cada caso del switch-----=====-----*/

caso_def                        : CASE expresion_interior LLAVE_APERTURA contenido_bloque LLAVE_CIERRE
                                {{
                                    $$ = {
                                        tipo: 'CASO_SWITCH',
                                        valor_comparacion: $2,
                                        cuerpo: $4,
                                        linea: @1.first_line,
                                        columna: @1.first_column + 1
                                    };
                                }}
                                | DEFAULT LLAVE_APERTURA contenido_bloque LLAVE_CIERRE
                                {{
                                    $$ = {
                                        tipo: 'DEFAULT_SWITCH',
                                        cuerpo: $3,
                                        linea: @1.first_line,
                                        columna: @1.first_column + 1
                                    };
                                }}
                                ;


/*-----=====-----Produccion que permite representar un condicional if dentro del componente-----=====-----*/

condicional_if_def          : IF PARENT_APERTURA expresion_interior PARENT_CIERRE LLAVE_APERTURA contenido_bloque LLAVE_CIERRE opciones_else
                            {{
                                $$ = {
                                    tipo: 'ESTRUCTURA_IF',
                                    condicion: $3,    
                                    cuerpo: $6,      
                                    continuacion: $8, 
                                    linea: @1.first_line,
                                    columna: @1.first_column + 1
                                };
                            }}
                            ;


/*-----=====-----Produccion que permite representar un condicional else-if encadenado con un if-----=====-----*/

opciones_else :         ELSE IF PARENT_APERTURA expresion_interior PARENT_CIERRE LLAVE_APERTURA contenido_bloque LLAVE_CIERRE opciones_else
                        {{
                            $$ = {
                                tipo: 'ELSE_IF',
                                condicion: $4,
                                cuerpo: $7,
                                continuacion: $9,
                                linea: @1.first_line,
                                columna: @1.first_column + 1
                            };
                        }}
                        | ELSE LLAVE_APERTURA contenido_bloque LLAVE_CIERRE
                        {{
                            $$ = {
                                tipo: 'ELSE_FINAL',
                                cuerpo: $3,
                                linea: @1.first_line,
                                columna: @1.first_column + 1
                            };
                        }}
                        | /* vacio */
                        {{
                            $$ = null;
                        }}
                        ;


/*-----=====-----Produccion que permite representar un ciclo for dentro del componente-----=====-----*/

ciclo_for_def                   : FOR EACH PARENT_APERTURA VARIABLE_DOLAR DOS_PUNTOS VARIABLE_DOLAR PARENT_CIERRE LLAVE_APERTURA contenido_bloque LLAVE_CIERRE empty_opcional
                                {{
                                    $$ = {
                                        tipo: 'FOR_EACH',
                                        arreglo: $4,
                                        iterador: $6,
                                        cuerpo: $9,
                                        linea: @1.first_line,
                                        columna: @1.first_column + 1
                                    };
                                }}
                                | FOR PARENT_APERTURA lista_iteradores PARENT_CIERRE TRACK VARIABLE_DOLAR LLAVE_APERTURA contenido_bloque LLAVE_CIERRE empty_opcional
                                {{
                                    $$ = {
                                        tipo: 'FOR_COMPLEJO',
                                        iteradores: $3,
                                        track: $6,
                                        cuerpo: $8,
                                        empty: $10,
                                        linea: @1.first_line,
                                        columna: @1.first_column + 1
                                    };
                                }}
                                ;

/*-----=====----- Producciones de los iteradores del for complejo -----=====-----*/

lista_iteradores                : lista_iteradores COMA iterador_def
                                {{
                                    $1.push($3);
                                    $$ = $1;
                                }}
                                | iterador_def
                                {{
                                    $$ = [$1];
                                }}
                                ;

/*-----=====----- Producciones del iterador definido -----=====-----*/

iterador_def                    : VARIABLE_DOLAR DOS_PUNTOS VARIABLE_DOLAR
                                {{
                                    $$ = {
                                        arreglo: $1,
                                        iterador: $3
                                    };
                                }}
                                ;

/*-----=====----- Produccion del bloque empty opcional -----=====-----*/

empty_opcional                  : EMPTY LLAVE_APERTURA contenido_bloque LLAVE_CIERRE
                                {{
                                    $$ = {
                                        tipo: 'EMPTY_BLOQUE',
                                        cuerpo: $3,
                                        linea: @1.first_line,
                                        columna: @1.first_column + 1
                                    };
                                }}
                                | /* vacio */
                                {{
                                    $$ = null;
                                }}
                                ;

/*-----=====----- Contenido generico de un bloque-----=====-----*/

contenido_bloque                : lista_componentes
                                {{
                                    $$ = $1;
                                }}
                                | /* vacio */
                                {{
                                    $$ = [];
                                }}
                                ;

/*-----=====----- Produccion del liestado del contenido generico de un bloque-----=====-----*/

lista_componentes               : lista_componentes cuerpo_componentes
                                {{
                                    $1.push($2);
                                    $$ = $1;
                                }}
                                | cuerpo_componentes
                                {{
                                    $$ = [$1];
                                }}
                                ;

/*-----=====-----Produccion que permite representar un formulario-----=====-----*/

form_def                : FORM LLAVE_APERTURA contenido_form LLAVE_CIERRE submit_opcional
                        {{
                            $$ = {
                                tipo: 'FORMULARIO',
                                estilos: [],
                                contenido: $3,
                                submit: $5,      
                                linea: @1.first_line,
                                columna: @1.first_column + 1
                            };
                        }}
                        | FORM estilos_opcionales LLAVE_APERTURA contenido_form LLAVE_CIERRE submit_opcional
                        {{
                            $$ = {
                                tipo: 'FORMULARIO',
                                estilos: $2,
                                contenido: $4,
                                submit: $6,      
                                linea: @1.first_line,
                                columna: @1.first_column + 1
                            };
                        }}
                        ;

/*-----=====-----Produccion que permite representar el contenido de un formulario-----=====-----*/

contenido_form              : contenido_form cuerpo_componentes
                            {{
                                $1.push($2);
                                $$ = $1;
                            }}
                            | cuerpo_componentes
                            {{
                                $$ = [$1];
                            }}
                            ;

/*-----=====-----Produccion que permite representar el submit del formulario-----=====-----*/

submit_opcional             : SUBMIT LLAVE_APERTURA lista_propiedades_submit LLAVE_CIERRE
                            {{
                                $$ = {
                                    tipo: 'SUBMIT',
                                    estilos: [],
                                    propiedades: $3,
                                    linea: @1.first_line,
                                    columna: @1.first_column + 1
                                };
                            }}
                            | SUBMIT MENOR lista_estilos_nombres MAYOR LLAVE_APERTURA lista_propiedades_submit LLAVE_CIERRE
                            {{
                                $$ = {
                                    tipo: 'SUBMIT',
                                    estilos: $3,
                                    propiedades: $6,
                                    linea: @1.first_line,
                                    columna: @1.first_column + 1
                                };
                            }}
                            | /* vacio */
                            {{ 
                                $$ = null; 
                            }}
                            ;

/*-----=====----- Lista de Propiedades (label: ..., function: ...) -----=====-----*/

lista_propiedades_submit    : lista_propiedades_submit COMA propiedad_submit
                            {{ 
                                $1.push($3); 
                                $$ = $1; 
                            }}
                            | propiedad_submit
                            {{ 
                                $$ = [$1]; 
                            }}
                            | /* vacio */
                            {{ 
                                $$ = []; 
                            }}
                            ;

/*-----=====----- Definicion de una sola propiedad -----=====-----*/

propiedad_submit            : LABEL DOS_PUNTOS valor_propiedad_submit
                            {{
                                $$ = {
                                    clave: $1,
                                    valor: $3,
                                    linea: @1.first_line,
                                    columna: @1.first_column + 1
                                };
                            }}
                            | FUNCTION DOS_PUNTOS valor_propiedad_submit
                            {{
                                $$ = {
                                    clave: $1, 
                                    valor: $3,
                                    linea: @1.first_line,
                                    columna: @1.first_column + 1
                                };
                            }}
                            ;

/*-----=====----- Valores que puede tener una propiedad del Submit -----=====-----*/

valor_propiedad_submit      : expresion_interior  
                            {{ 
                                $$ = $1; 
                            }}
                            | VARIABLE_DOLAR PARENT_APERTURA lista_argumentos_llamada PARENT_CIERRE
                            {{
                                $$ = {
                                    tipo: 'LLAMADA_FUNCION_VAR',
                                    nombre: $1,
                                    argumentos: $3,
                                    linea: @1.first_line,
                                    columna: @1.first_column + 1
                                };
                            }}
                            ;

/*-----=====----- Argumentos permitidos adentro de los paréntesis de la función -----=====-----*/

lista_argumentos_llamada    : lista_argumentos_llamada COMA argumento_llamada
                            {{ 
                                $1.push($3); 
                                $$ = $1; 
                            }}
                            | argumento_llamada
                            {{ 
                                $$ = [$1]; 
                            }}
                            | /* vacio */
                            {{ 
                                $$ = []; 
                            }}
                            ;

/*-----=====----- Produccion de los argumentos dentro de una funcion-----=====-----*/

argumento_llamada           : expresion_interior  
                            {{
                                $$ = $1; 
                            }}
                            | ARROBA_VAR          
                            {{ 
                                $$ = { 
                                    tipo: 'ARROBA_VAR', 
                                    nombre: $1, 
                                    linea: @1.first_line, 
                                    columna: @1.first_column + 1 
                                }; 
                            }}
                            ;

/*-----=====----- Producciones de los Inputs -----=====-----*/

input_def            : INPUT_TEXT PARENT_APERTURA lista_propiedades_comunes PARENT_CIERRE
                     {{ 
                        $$ = { 
                            tipo: 'INPUT_TEXT', 
                            estilos: [], 
                            propiedades: $3, 
                            linea: @1.first_line, 
                            columna: @1.first_column + 1 
                        };
                     }}
                     | INPUT_TEXT MENOR lista_estilos_nombres MAYOR PARENT_APERTURA lista_propiedades_comunes PARENT_CIERRE
                     {{ 
                         $$ = { 
                             tipo: 'INPUT_TEXT', 
                             estilos: $3, 
                             propiedades: $6, 
                             linea: @1.first_line, 
                             columna: @1.first_column + 1 
                         };
                     }}
                     | INPUT_NUMBER PARENT_APERTURA lista_propiedades_comunes PARENT_CIERRE
                     {{ 
                         $$ = { 
                             tipo: 'INPUT_NUMBER', 
                             estilos: [], 
                             propiedades: $3, 
                             linea: @1.first_line, 
                             columna: @1.first_column + 1 
                         };
                     }}
                     | INPUT_NUMBER MENOR lista_estilos_nombres MAYOR PARENT_APERTURA lista_propiedades_comunes PARENT_CIERRE
                     {{ 
                         $$ = { 
                             tipo: 'INPUT_NUMBER', 
                             estilos: $3, 
                             propiedades: $6, 
                             linea: @1.first_line, 
                             columna: @1.first_column + 1 
                         };
                     }}
                     | INPUT_BOOL PARENT_APERTURA lista_propiedades_bool PARENT_CIERRE
                     {{ 
                         $$ = { 
                             tipo: 'INPUT_BOOL', 
                             estilos: [], 
                             propiedades: $3, 
                             linea: @1.first_line, 
                             columna: @1.first_column + 1
                         };
                     }}
                     | INPUT_BOOL MENOR lista_estilos_nombres MAYOR PARENT_APERTURA lista_propiedades_bool PARENT_CIERRE
                     {{ 
                         $$ = { 
                             tipo: 'INPUT_BOOL', 
                             estilos: $3, 
                             propiedades: $6, 
                             linea: @1.first_line, 
                             columna: @1.first_column + 1
                         };
                     }}
                     ;


/*-----=====----- Produccion que permite identificar las Propiedades del input booleano-----=====-----*/

lista_propiedades_bool              : lista_propiedades_bool COMA propiedad_bool
                                    {{ 
                                        $1.push($3); 
                                        $$ = $1; 
                                    }}
                                    | propiedad_bool
                                    {{ 
                                        $$ = [$1]; 
                                    }}
                                    ;

/*-----=====----- Produccion que permite identificar la propiedad del input booleano-----=====-----*/

propiedad_bool                 : ID DOS_PUNTOS valor_propiedad
                                {{
                                    $$ = {
                                        tipo: 'ID',
                                        clave: $1,   
                                        valor: $3,   
                                        linea: @1.first_line,
                                        columna: @1.first_column + 1
                                    };
                                }}
                                | LABEL DOS_PUNTOS valor_propiedad
                                {{
                                    $$ = {
                                        tipo: 'LABEL',
                                        clave: $1,   
                                        valor: $3,   
                                        linea: @1.first_line,
                                        columna: @1.first_column + 1
                                    };
                                }}
                                | VALUE DOS_PUNTOS valor_propiedad_bool
                                {{
                                    $$ = {
                                        tipo: 'VALUE',
                                        clave: $1,   
                                        valor: $3,   
                                        linea: @1.first_line,
                                        columna: @1.first_column + 1
                                    };
                                }}
                                ;


/*-----=====-----Produccion que permite recibir un valor booleano-----=====-----*/

valor_propiedad_bool            : expresion_interior  
                                {{ 
                                    $$ = $1; 
                                }}
                                | TRUE
                                {{
                                    $$ = {
                                        tipo: 'VALOR_TRUE',
                                        valor: $1,
                                        linea: @1.first_line,
                                        columna: @1.first_column + 1
                                    };
                                }}
                                | FALSE
                                {{
                                    $$ = {
                                        tipo: 'VALOR_FALSE',
                                        valor: $1,
                                        linea: @1.first_line,
                                        columna: @1.first_column + 1
                                    };
                                }}
                                ;


/*-----=====----- Produccion que permite identificar las Propiedades del input comunes-----=====-----*/

lista_propiedades_comunes           : lista_propiedades_comunes COMA propiedad_comun
                                    {{ 
                                        $1.push($3); 
                                        $$ = $1; 
                                    }}
                                    | propiedad_comun
                                    {{ 
                                        $$ = [$1]; 
                                    }}
                                    | lista_propiedades_comunes COMA error
                                    {{
                                        reportarError(yy, { 
                                            descripcion: 'Error de sintaxis en una propiedad.', 
                                            loc: @3, texto: yytext 
                                        });
                                        $$ = $1;
                                    }}
                                    ;

/*-----=====----- Produccion que que permite definir que propiedades tendra el input-----=====-----*/

propiedad_comun                 : ID DOS_PUNTOS valor_propiedad
                                {{
                                    $$ = {
                                        tipo: 'ID',
                                        clave: $1,   
                                        valor: $3,   
                                        linea: @1.first_line,
                                        columna: @1.first_column + 1
                                    };
                                }}
                                | LABEL DOS_PUNTOS valor_propiedad
                                {{
                                    $$ = {
                                        tipo: 'LABEL',
                                        clave: $1,   
                                        valor: $3,   
                                        linea: @1.first_line,
                                        columna: @1.first_column + 1
                                    };
                                }}
                                | VALUE DOS_PUNTOS valor_propiedad
                                {{
                                    $$ = {
                                        tipo: 'VALUE',
                                        clave: $1,   
                                        valor: $3,   
                                        linea: @1.first_line,
                                        columna: @1.first_column + 1
                                    };
                                }}
                                ;

/*-----=====----- Produccion que que permite definir el valor de las propiedades de los inputs-----=====-----*/

valor_propiedad             : expresion_interior  
                            {{ 
                                $$ = $1; 
                            }}
                            ;

/*-----=====-----Produccion que permite representar el cuerpo de una imagen-----=====-----*/

img_def             : IMG PARENT_APERTURA lista_argumentos_img PARENT_CIERRE
                    {{ 
                        $$ = {
                            tipo: 'COMPONENTE_IMG',
                            estilos: null,     
                            urls: $3,         
                            linea: @1.first_line,
                            columna: @1.first_column + 1
                        };
                    }}
                    | IMG MENOR lista_estilos_nombres MAYOR PARENT_APERTURA lista_argumentos_img PARENT_CIERRE
                    {{ 
                        $$ = {
                            tipo: 'COMPONENTE_IMG',
                            estilos: $3,     
                            urls: $6,         
                            linea: @1.first_line,
                            columna: @1.first_column + 1
                        };
                    }}
                    ;

/*-----=====----- Lista de argumentos/URLs para el componente IMG -----=====-----*/

lista_argumentos_img    : lista_argumentos_img COMA argumento_img
                        {{
                            $1.push($3);
                            $$ = $1;
                        }}
                        | argumento_img
                        {{
                            $$ = [$1];
                        }}
                        ;

/*-----=====----- Produccion de argumentos de las imagenes-----=====-----*/

argumento_img           : expresion_interior
                        {{
                            $$ = $1; 
                        }}
                        ;

/*-----=====-----Produccion que permite representar el cuerpo de un texto-----=====-----*/

text_def                : TEXT PARENT_APERTURA expresion_interior PARENT_CIERRE
                        {{ 
                            $$ = {
                                tipo: 'COMPONENTE_TEXTO',
                                estilos: [],    
                                contenido: $3,    
                                linea: @1.first_line,
                                columna: @1.first_column + 1
                            };
                        }}
                        | TEXT estilos_opcionales PARENT_APERTURA expresion_interior PARENT_CIERRE
                        {{ 
                            $$ = {
                                tipo: 'COMPONENTE_TEXTO',
                                estilos: $2,    
                                contenido: $4,
                                linea: @1.first_line,
                                columna: @1.first_column + 1
                            };
                        }}
                        ;
                        
/*-----=====-----Produccion de la definicion de la tabla-----=====-----*/

tablas_def              : estilos_opcionales CORCHETE_DOBLE_APERTURA lista_filas CORCHETE_DOBLE_CIERRE
                        {{
                            $$ = { 
                                tipo: 'TABLA', 
                                estilos: $1, 
                                filas: $3, 
                                total_filas: $3.length, 
                                total_columnas: $3.length > 0 ? $3[0].cantidad_celdas : 0, 
                                linea: @1.first_line, 
                                columna: @1.first_column + 1 
                            };
                        }}
                        | CORCHETE_DOBLE_APERTURA lista_filas CORCHETE_DOBLE_CIERRE
                        {{
                            $$ = { 
                                tipo: 'TABLA', 
                                estilos: [], 
                                filas: $2, 
                                total_filas: $2.length, 
                                total_columnas: $2.length > 0 ? $2[0].cantidad_celdas : 0, 
                                linea: @1.first_line, 
                                columna: @1.first_column + 1 
                            };
                        }}
                        ;

/*-----=====-----Produccion que permite representar la lista de filas-----=====-----*/

lista_filas                 : lista_filas fila_def
                            {{
                                $1.push($2);
                                $$ = $1;
                            }}
                            | /* vacio */
                            {{ $$ = []; }}
                            ;


/*-----=====-----Produccion que permite reconocer filas-----=====-----*/

fila_def                : estilos_opcionales CORCHETE_DOBLE_APERTURA lista_celdas CORCHETE_DOBLE_CIERRE
                        {{
                            $$ = { 
                                tipo: 'FILA', 
                                estilos: $1, 
                                celdas: $3, 
                                cantidad_celdas: $3.length, 
                                linea: @1.first_line, 
                                columna: @1.first_column + 1 
                            };
                        }}
                        | CORCHETE_DOBLE_APERTURA lista_celdas CORCHETE_DOBLE_CIERRE
                        {{
                            $$ = { 
                                tipo: 'FILA',
                                estilos: [], 
                                celdas: $2, cantidad_celdas: $2.length, 
                                linea: @1.first_line, 
                                columna: @1.first_column + 1 
                            };
                        }}
                        ;

/*-----=====-----Produccion que permite reconocer listado de celdas-----=====-----*/

lista_celdas                : lista_celdas celda_def
                            {{
                                $1.push($2);
                                $$ = $1;
                            }}
                            | /* vacio */
                            {{ $$ = []; }}
                            ;


/*-----=====-----Produccion que permite reconocer celdas-----=====-----*/

celda_def               : estilos_opcionales CORCHETE_DOBLE_APERTURA contenido_celda CORCHETE_DOBLE_CIERRE
                        {{
                            $$ = { 
                                tipo: 'CELDA', 
                                estilos: $1, 
                                contenido: $3, 
                                linea: @1.first_line, 
                                columna: @1.first_column + 1 
                            };
                        }}
                        | CORCHETE_DOBLE_APERTURA contenido_celda CORCHETE_DOBLE_CIERRE
                        {{
                            $$ = { 
                                tipo: 'CELDA', 
                                estilos: [], 
                                contenido: $2, 
                                linea: @1.first_line, 
                                columna: @1.first_column + 1 
                            };
                        }}
                        ;

/*-----=====-----Produccion que permite reconocer el cuerpo de las celdas-----=====-----*/

contenido_celda             : contenido_celda cuerpo_componentes
                            {{
                                $1.push($2);
                                $$ = $1;
                            }}
                            | /* vacio */
                            {{ $$ = []; }}
                            ;

/*-----=====-----Produccion que permite representar a las secciones -----=====-----*/

secciones_def           : estilos_opcionales CORCHETE_APERTURA contenido_seccion CORCHETE_CIERRE
                        {{
                            $$ = { 
                                tipo: 'SECCION', 
                                estilos: $1, 
                                contenido: $3, 
                                linea: @1.first_line, 
                                columna: @1.first_column + 1 
                            };
                        }}
                        | CORCHETE_APERTURA contenido_seccion CORCHETE_CIERRE
                        {{
                            $$ = { 
                                tipo: 'SECCION', 
                                estilos: [], 
                                contenido: $2, 
                                linea: @1.first_line, 
                                columna: @1.first_column + 1 
                            };
                        }}
                        ;

/*-----=====-----Produccion que permite representar el cuerpo que tienen las secciones-----=====-----*/

contenido_seccion           : contenido_seccion cuerpo_componentes 
                            {{ 
                                $1.push($2); 
                                $$ = $1; 
                            }}
                            | /* vacio */ 
                            {{ 
                                $$ = [];
                            }}
                            ;


/*-----=====-----Produccion que permite representar a los estilos que puede tener un componente-----=====-----*/

estilos_opcionales            : MENOR lista_estilos_nombres MAYOR    
                                {{ 
                                    $$ = $2; 
                                }}
                                ;

/*-----=====-----Produccion que permite representar a la lista de estilos que puede tener un componente-----=====-----*/

lista_estilos_nombres           : lista_estilos_nombres COMA IDENTIFICADOR 
                                {{ 
                                    $1.push($3); 
                                    $$ = $1; 
                                }}
                                | IDENTIFICADOR                            
                                {{ 
                                    $$ = [$1]; 
                                }}
                                ;

/*-----=====-----Produccion que permite representar el listado de los parametros dentro de una funcion-----=====-----*/

lista_parametros    : lista_parametros COMA parametro_def
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

/*-----=====----- Producción principal para Strings con datos o variables adentro  o simplemente textos normales-----=====-----*/

cadena_interpolada      : COMILLA contenido_string COMILLA
                        {{
                            $$ = {
                                tipo: 'CADENA_INTERPOLADA',
                                fragmentos: $2, 
                                loc_linea: @1.first_line,
                                loc_columna: @1.first_column + 1
                            };
                        }}
                        | COMILLA COMILLA
                        {{
                            $$ = {
                                tipo: 'CADENA_INTERPOLADA',
                                fragmentos: [], 
                                loc_linea: @1.first_line,
                                loc_columna: @1.first_column + 1
                            };
                        }}
                        ;

/*-----=====----- Produccion de la lista recursiva de fragmentos dentro de un string -----=====-----*/

contenido_string        : contenido_string fragmento_string
                        {{
                            $1.push($2);
                            $$ = $1;
                        }}
                        | fragmento_string
                        {{
                            $$ = [$1];
                        }}
                        ;

/*-----=====----- Los 3 tipos de fragmentos posibles dentro de las comillas -----=====-----*/

fragmento_string        : TEXTO_CADENA
                        {{
                            $$ = { 
                                tipo: 'TEXTO_PLANO', 
                                valor: $1,
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
                        | BACKTICK expresion_interior BACKTICK
                        {{
                            $$ = { 
                                tipo: 'EXPRESION_INTERPOLADA', 
                                expresion: $2,
                                loc_linea: @1.first_line,
                                loc_columna: @1.first_column + 1
                            };
                        }}
                        ;



/*-----=====-----Produccion del cuerpo que pueden contener definiciones de expresiones especiales en el for -----=====-----*/

expresion_interior      : expresion_interior MAS expresion_interior
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
                        | expresion_interior MENOS expresion_interior
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
                        | expresion_interior MULTIPLICACION expresion_interior
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
                        | expresion_interior DIVISION expresion_interior
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
                        | expresion_interior MODULO expresion_interior
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
                        | expresion_interior MAYOR expresion_interior
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
                        | expresion_interior MENOR expresion_interior
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
                        | expresion_interior MAYOR_IGUAL expresion_interior
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
                        | expresion_interior MENOR_IGUAL expresion_interior
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
                        | expresion_interior IGUALACION expresion_interior
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
                        | expresion_interior DIFERENTE expresion_interior
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
                        | expresion_interior OR expresion_interior
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
                        | expresion_interior AND expresion_interior
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
                        | MENOS expresion_interior %prec UMENOS
                        {{ 
                            $$ = { 
                                tipo: 'OPERACION_UNARIA', 
                                operador: 'MENOS_UNARIO', 
                                valor: $2,
                                loc_linea: @1.first_line, 
                                loc_columna: @1.first_column + 1 
                            }; 
                        }}
                        | NOT expresion_interior
                        {{ 
                            $$ = { 
                                tipo: 'OPERACION_UNARIA', 
                                operador: 'NOT', 
                                valor: $2,
                                loc_linea: @1.first_line, 
                                loc_columna: @1.first_column + 1  
                            }; 
                        }}
                        | PARENT_APERTURA expresion_interior PARENT_CIERRE
                        {{
                            $$ = $2; 
                        }}
                        | ENTERO
                        {{
                            $$ = { 
                                tipo: 'VALOR', 
                                valor: Number($1),
                                loc_linea: @1.first_line, 
                                loc_columna: @1.first_column + 1 
                            }; 
                        }}
                        | DECIMAL
                        {{
                            $$ = { 
                                tipo: 'VALOR', 
                                valor: Number($1),
                                loc_linea: @1.first_line, 
                                loc_columna: @1.first_column + 1  
                            };                       
                        }}
                        | VARIABLE_DOLAR CORCHETE_APERTURA expresion_interior CORCHETE_CIERRE
                        {{ 
                            $$ = { 
                                tipo: 'ACCESO_ARREGLO', 
                                nombre: $1,
                                indice: $3,
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
                        | cadena_interpolada
                        {{
                            $$  = $1;
                        }}
                        ;


/*-----=====-----Producion de los tipos de variables que se reciben en el  .comp-----=====-----*/

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
                        | FUNCTION
                        {{
                            $$  = 'FUNCTION';
                        }}
                        ;