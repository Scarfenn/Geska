import { TODAS_LAS_RECETAS as recetas } from "@/storage/recetas";
import { CATEGORIAS } from "@/features/cocina/CategoriasC";



  // Convertir tiempo a minutos
export const tiempoAMinutos = (tiempoStr) => {
    const match = tiempoStr.match(/(\d+)/);
    return match ? parseInt(match[1]) : 0;
  };
  
// Función para obtener recomendaciones aleatorias
export const obtenerRecomendacionesAleatorias = (cantidad = 5) => {
    // Mezclar array aleatoriamente
    const recetasMezcladas = [...recetas].sort(() => Math.random() - 0.5);
    return recetasMezcladas.slice(0, cantidad);
  };

export const obtenerRecomendacionesPersonalizadas = (preferencias) => {
  const { categoria, tiempoMaximo, sinGluten, vegetariano, vegano, saludable, rapido } = preferencias;

  let recetasFiltradas = [...recetas];

  // Filtrar por categoría
  if (categoria && categoria !== 'todas') {
    const categoriaObj = CATEGORIAS.find(c => c.id === categoria);
    if (categoriaObj) {
      recetasFiltradas = recetasFiltradas.filter(receta =>
        receta.categoria === categoriaObj.nombre
      );
    }
  }

  // Filtrar por tiempo máximo
  recetasFiltradas = recetasFiltradas.filter(receta =>
    tiempoAMinutos(receta.tiempo) <= tiempoMaximo
  );

  // Filtrar por sin gluten
  if (sinGluten) {
    recetasFiltradas = recetasFiltradas.filter(receta =>
      !receta.alergenos.includes('gluten')
    );
  }

  // Filtrar por vegetariano
  if (vegetariano) {
    recetasFiltradas = recetasFiltradas.filter(receta =>
      receta.tags && receta.tags.includes('vegetariano')
    );
  }

  // Filtrar por vegano
  if (vegano) {
    recetasFiltradas = recetasFiltradas.filter(receta =>
      receta.tags && receta.tags.includes('vegano')
    );
  }

  // Filtrar por saludable
  if (saludable) {
    recetasFiltradas = recetasFiltradas.filter(receta =>
      receta.tags && receta.tags.includes('saludable')
    );
  }

  // Filtrar por rápido (<30 min)
  if (rapido) {
    recetasFiltradas = recetasFiltradas.filter(receta =>
      tiempoAMinutos(receta.tiempo) <= 30
    );
  }

  // Mezclar resultados
  recetasFiltradas = recetasFiltradas.sort(() => Math.random() - 0.5);

  return recetasFiltradas.slice(0, 10);
};  


  
