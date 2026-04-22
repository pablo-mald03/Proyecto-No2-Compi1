import jison from 'jison';
import fs from 'fs';
import path from 'path';

const directorios = [

    "./src/lib/analizador/compiler",
    "./src/lib/analizador/lexical"
];

directorios.forEach(dir => {
    
    if (!fs.existsSync(dir)) {
        console.warn(`La carpeta ${dir} no existe.`);
        return;
    }

    const archivos = fs.readdirSync(dir);

    archivos.forEach(archivo => {
      
        if (path.extname(archivo) === '.jison') {
            const grammarPath = path.join(dir, archivo);
           
            const outputPath = path.join(dir, archivo.replace('.jison', '.js'));

            try {
                const grammar = fs.readFileSync(grammarPath, 'utf8');
                const parser = new jison.Generator(grammar);
                const parserSource = parser.generate({ moduleType: 'commonjs' });

                //Agregado para poderlo utilizar en svelte
                const esmSource = `
${parserSource}
export const parse = (input) => parser.parse(input);
export default parser;
`;
                fs.writeFileSync(outputPath, esmSource);
            } catch (error) {
                console.error(`Error fatal compilando ${archivo}:`, error.message);
            }
        }
    });
});
