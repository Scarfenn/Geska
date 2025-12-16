import React, { useState, useEffect, useRef } from 'react';
import { 
  Text, 
  View, 
  TextInput, 
  TouchableOpacity,
  ScrollView,
  FlatList,
  StatusBar,
  Modal,
  Alert
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import createStylesC from '../../cocina/stylesC';
import ThemeSelector from '../components/ThemeSelector';
import { themes } from '../../tasks/styles/themes';
import { TODAS_LAS_RECETAS } from '../storage/recetas';
import { CATEGORIAS, ALERGENOS, TAGS_ESPECIALES } from '../../cocina/CategoriasC';
import { obtenerRecomendacionesAleatorias, obtenerRecomendacionesPersonalizadas, tiempoAMinutos } from '../../cocina/recomendaciones';
import RecipeCard from '../../cocina/recipeCard';
import ModalFiltros from '../../cocina/ModalFiltros';


// ==================== COMPONENTE PRINCIPAL ====================
export default function CookScreen({themeName, mode, setThemeName, setMode}) {
  const [recetas, setRecetas] = useState(TODAS_LAS_RECETAS);
  const [favoritos, setFavoritos] = useState([]);
  const [busqueda, setBusqueda] = useState('');
  const [categoriaSeleccionada, setCategoriaSeleccionada] = useState('todas');
  const [pantallaActual, setPantallaActual] = useState('inicio');
  const [recetaDetalle, setRecetaDetalle] = useState(null);
  const [modalVisible, setModalVisible] = useState(false);
  
  // Estados para filtros avanzados
  const [mostrarFiltros, setMostrarFiltros] = useState(false);
  const [filtrosAlergenos, setFiltrosAlergenos] = useState(ALERGENOS);
  const [filtrosTags, setFiltrosTags] = useState(TAGS_ESPECIALES);
  const [tiempoMaximo, setTiempoMaximo] = useState(240);
  const [dificultadFiltro, setDificultadFiltro] = useState(['Fácil', 'Media', 'Difícil']);
  const [mostrarRecomendador, setMostrarRecomendador] = useState(false);
  const [recomendaciones, setRecomendaciones] = useState([]);
  const [preferenciasRecomendacion, setPreferenciasRecomendacion] = useState({
    categoria: '',
    tiempoMaximo: 60,
    sinGluten: false,
    vegetariano: false,
    vegano: false,
    saludable: false,
    rapido: false
  });

  // ==================== ESTADOS PARA PAGINACIÓN ====================
const [paginaActual, setPaginaActual] = useState(1);
const [recetasPorPagina, setRecetasPorPagina] = useState(12);
const [totalPaginas, setTotalPaginas] = useState(1);

  // Estado para modo oscuro
  const styles = createStylesC(themeName, mode);
  const modoOscuro = mode === "dark";

  // Colores para modo oscuro y claro
  const crearTemaActual = (theme) => ({
  fondo: theme.background,
  fondoHeader: theme.primary,          
  fondoNav: theme.primary,
  fondoCard: theme.card,
  fondoCardSecundario: theme.background,
  fondoModal: theme.background,
  fondoFooter: theme.background,

  texto: theme.text,
  textoSubtitulo: theme.pendingText,
  textoInput: theme.text,

  borde: theme.border,
  sombra: '#000'
});

  const theme = themes[themeName][mode];
  const temaActual = crearTemaActual(theme);

  // Cargar favoritos
  useEffect(() => {
    cargarFavoritos();
  }, []);

  // ==================== EFECTO PARA REINICIAR PAGINA AL FILTRAR ====================
useEffect(() => {
  // Cuando cambia la búsqueda, categoría o filtros, volver a página 1
  setPaginaActual(1);
}, [busqueda, categoriaSeleccionada, tiempoMaximo, dificultadFiltro, filtrosAlergenos, filtrosTags]);

  const cargarFavoritos = async () => {
    try {
      const favoritosGuardados = await AsyncStorage.getItem('favoritos');
      if (favoritosGuardados) {
        const idsFavoritos = JSON.parse(favoritosGuardados);
        setFavoritos(idsFavoritos);
        setRecetas(prevRecetas => 
          prevRecetas.map(receta => ({
            ...receta,
            esFavorita: idsFavoritos.includes(receta.id)
          }))
        );
      }
    } catch (error) {
      console.error('Error al cargar favoritos:', error);
    }
  };

 // Función para generar recomendaciones
  const generarRecomendaciones = (personalizadas = false) => {
    if (personalizadas) {
      const recomendacionesPersonalizadas = obtenerRecomendacionesPersonalizadas(preferenciasRecomendacion);
      setRecomendaciones(recomendacionesPersonalizadas);
      
      if (recomendacionesPersonalizadas.length === 0) {
        Alert.alert(
          'Sin resultados',
          'No encontramos recetas que coincidan con tus preferencias. Intenta con filtros menos estrictos.',
          [{ text: 'OK' }]
        );
      }
    } else {
      setRecomendaciones(obtenerRecomendacionesAleatorias(5));
    }
    
    setMostrarRecomendador(true);
  };

  // Función para resetear preferencias
const resetearPreferencias = () => {
    setPreferenciasRecomendacion({
      categoria: '',
      tiempoMaximo: 60,
      sinGluten: false,
      vegetariano: false,
      vegano: false,
      saludable: false,
      rapido: false
    });
  };

  const guardarFavorito = async (recetaId) => {
    try {
      let nuevosFavoritos;
      if (favoritos.includes(recetaId)) {
        nuevosFavoritos = favoritos.filter(id => id !== recetaId);
      } else {
        nuevosFavoritos = [...favoritos, recetaId];
      }
      
      setFavoritos(nuevosFavoritos);
      await AsyncStorage.setItem('favoritos', JSON.stringify(nuevosFavoritos));
      
      setRecetas(prevRecetas => 
        prevRecetas.map(receta => ({
          ...receta,
          esFavorita: nuevosFavoritos.includes(receta.id)
        }))
      );
      
      if (recetaDetalle && recetaDetalle.id === recetaId) {
        setRecetaDetalle(prev => ({
          ...prev,
          esFavorita: nuevosFavoritos.includes(recetaId)
        }));
      }
    } catch (error) {
      console.error('Error al guardar favorito:', error);
    }
  };

  // Filtrar recetas
  const recetasFiltradasCompletas = recetas.filter(receta => {
    const coincideBusqueda = 
      receta.nombre.toLowerCase().includes(busqueda.toLowerCase()) ||
      receta.descripcion.toLowerCase().includes(busqueda.toLowerCase()) ||
      receta.ingredientes.some(ing => ing.toLowerCase().includes(busqueda.toLowerCase()));
    
    let coincideCategoria = true;
    if (categoriaSeleccionada !== 'todas') {
      const categoria = CATEGORIAS.find(c => c.id === categoriaSeleccionada);
      coincideCategoria = receta.categoria === categoria.nombre;
    }
    
    const tiempoReceta = tiempoAMinutos(receta.tiempo);
    const coincideTiempo = tiempoReceta <= tiempoMaximo;
    
    const coincideDificultad = dificultadFiltro.includes(receta.dificultad);
    
    const alergenosActivos = filtrosAlergenos.filter(a => a.activo).map(a => a.id);
    const contieneAlergeno = alergenosActivos.some(alergeno => 
      receta.alergenos && receta.alergenos.includes(alergeno)
    );
    
    const tagsActivos = filtrosTags.filter(t => t.activo).map(t => t.id);
    const coincideTags = tagsActivos.length === 0 || 
      tagsActivos.some(tag => receta.tags && receta.tags.includes(tag));
    
    return coincideBusqueda && 
           coincideCategoria && 
           coincideTiempo && 
           coincideDificultad && 
           !contieneAlergeno && 
           coincideTags;
  });

  // ==================== CÁLCULO DE PAGINACIÓN ====================
// Calcular índices para la página actual
const indexUltimaReceta = paginaActual * recetasPorPagina;
const indexPrimeraReceta = indexUltimaReceta - recetasPorPagina;

// Obtener recetas solo para la página actual
const recetasFiltradasPaginadas = recetasFiltradasCompletas.slice(indexPrimeraReceta, indexUltimaReceta);

  const recetasFavoritas = recetas.filter(receta => favoritos.includes(receta.id));

    // ==================== EFECTO PARA CALCULAR TOTAL DE PÁGINAS ====================
useEffect(() => {
  const total = Math.ceil(recetasFiltradasCompletas.length / recetasPorPagina);
  setTotalPaginas(total > 0 ? total : 1);
  
  // Si la página actual es mayor que el total de páginas, volver a la primera
  if (paginaActual > total) {
    setPaginaActual(1);
  }
}, [recetasFiltradasCompletas, recetasPorPagina]);

  // Mostrar detalle de receta
  const mostrarDetalleReceta = (receta) => {
    setRecetaDetalle(receta);
    setModalVisible(true);
  };

  // Toggle filtro de alérgeno
  const toggleAlergeno = (id) => {
    setFiltrosAlergenos(prev => 
      prev.map(alergeno => 
        alergeno.id === id ? { ...alergeno, activo: !alergeno.activo } : alergeno
      )
    );
  };

  // Toggle filtro de tag
  const toggleTag = (id) => {
    setFiltrosTags(prev => 
      prev.map(tag => 
        tag.id === id ? { ...tag, activo: !tag.activo } : tag
      )
    );
  };

  // Limpiar todos los filtros
  const limpiarFiltros = () => {
    setFiltrosAlergenos(ALERGENOS.map(a => ({ ...a, activo: false })));
    setFiltrosTags(TAGS_ESPECIALES.map(t => ({ ...t, activo: false })));
    setTiempoMaximo(240);
    setDificultadFiltro(['Fácil', 'Media', 'Difícil']);
    Alert.alert('Filtros limpiados', 'Todos los filtros han sido restablecidos');
  };

  // ==================== FUNCIONES BÁSICAS DE PAGINACIÓN ====================
// Crear referencia para FlatList
const listaRef = useRef(null);

// Función para página siguiente
const siguientePagina = () => {
  if (paginaActual < totalPaginas) {
    setPaginaActual(paginaActual + 1);
    if (listaRef.current) {
      listaRef.current.scrollToOffset({ offset: 0, animated: true });
    }
  }
};

// Función para página anterior
const paginaAnterior = () => {
  if (paginaActual > 1) {
    setPaginaActual(paginaActual - 1);
    if (listaRef.current) {
      listaRef.current.scrollToOffset({ offset: 0, animated: true });
    }
  }
};

    // Renderizar modal de recomendación
  const RenderModalRecomendacion = () => (
    <Modal
      animationType="slide"
      transparent={true}
      visible={mostrarRecomendador}
      onRequestClose={() => setMostrarRecomendador(false)}
    >
      <View style={styles.modalRecomendacion}>
        <View style={[styles.modalRecomendacionContent, { backgroundColor: temaActual.fondoModal }]}>
          <View style={[styles.modalRecomendacionHeader, { borderBottomColor: temaActual.borde }]}>
            <Text style={[styles.modalRecomendacionTitulo, { color: temaActual.texto }]}>
            {"\u{1F3AF}"} Recomendador de Recetas
            </Text>
            <TouchableOpacity onPress={() => setMostrarRecomendador(false)}>
              <Text style={[styles.cerrarRecomendacion, { color: temaActual.textoSubtitulo }]}>{"\u{2715}"}</Text>
            </TouchableOpacity>
          </View>
          
          <ScrollView style={styles.recomendacionScroll}>
            {/* Preferencias de recomendación */}
            <View style={styles.recomendacionGrupo}>
              <Text style={[styles.recomendacionTitulo, { color: temaActual.texto }]}>
                📝 Preferencias de Recomendación
              </Text>
              
              {/* Categoría - CON MEJOR CONTRASTE */}
<View style={styles.recomendacionItem}>
  <Text style={[styles.recomendacionLabel, { color: modoOscuro ? '#FFFFFF' : '#2C3E50' }]}>
    📂 Categoría:
  </Text>
  <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.categoriasRecomendacion}>
    {CATEGORIAS.map(categoria => {
      const estaActivo = preferenciasRecomendacion.categoria === categoria.id;
      
      // COLORES PARA MODO DÍA
      let colorFondo, colorBorde, colorTexto;
      
      if (modoOscuro) {
        // Modo oscuro
        colorFondo = estaActivo ? '#3f7c78ff' : '#2D2D2D';
        colorBorde = estaActivo ? '#FFFFFF' : '#444444';
        colorTexto = estaActivo ? '#FFFFFF' : '#B0B0B0';
      } else {
        // Modo día - USAR CONTRASTE FUERTE
        colorFondo = estaActivo ? '#3f7c78ff' : '#f5f5f5';
        colorBorde = estaActivo ? '#FF6B35' : '#d0d0d0'; // NARANJA para destacar
        colorTexto = estaActivo ? '#FFFFFF' : '#555555';
      }
      
      return (
        <TouchableOpacity
          key={categoria.id}
          style={[
            styles.categoriaRecomendacionBtn,
            estaActivo && styles.categoriaRecomendacionBtnActive,
            {
              backgroundColor: colorFondo,
              borderColor: colorBorde,
              borderWidth: estaActivo ? 3 : 1, // Borde más grueso cuando está activo
              borderRadius: 20,
              elevation: estaActivo ? 4 : 1, // Sombra más fuerte cuando está activo
              shadowColor: '#000',
              shadowOffset: estaActivo ? { width: 0, height: 3 } : { width: 0, height: 1 },
              shadowOpacity: estaActivo ? 0.3 : 0.1,
              shadowRadius: estaActivo ? 4 : 2,
            }
          ]}
          onPress={() => setPreferenciasRecomendacion(prev => ({
            ...prev,
            categoria: prev.categoria === categoria.id ? '' : categoria.id
          }))}
        >
          <Text style={[
            styles.categoriaRecomendacionText,
            estaActivo && styles.categoriaRecomendacionTextActive,
            {
              color: colorTexto,
              fontWeight: estaActivo ? 'bold' : '600',
              fontSize: 14,
              textShadowColor: estaActivo ? 'rgba(0, 0, 0, 0.2)' : 'transparent',
              textShadowOffset: estaActivo ? { width: 1, height: 1 } : { width: 0, height: 0 },
              textShadowRadius: estaActivo ? 2 : 0,
            }
          ]}>
            {categoria.icono} {categoria.nombre}
          </Text>
        </TouchableOpacity>
      );
    })}
  </ScrollView>
</View>
              
              {/* Tiempo máximo - VERSIÓN MEJORADA */}
<View style={styles.recomendacionItem}>
  <Text style={[styles.recomendacionLabel, { color: temaActual.texto }]}>
    ⏱️ Tiempo máximo: {preferenciasRecomendacion.tiempoMaximo} min
  </Text>
  
  <View style={styles.sliderRecomendacionContainer}>
    <Text style={[styles.sliderMin, { color: temaActual.textoSubtitulo }]}>15</Text>
    <View style={[styles.sliderTrack, { backgroundColor: temaActual.borde }]}>
      <View style={[styles.sliderFill, { 
        width: `${((preferenciasRecomendacion.tiempoMaximo - 15) / (180 - 15)) * 100}%`,
        backgroundColor: '#4ECDC4'
      }]} />
    </View>
    <Text style={[styles.sliderMax, { color: temaActual.textoSubtitulo }]}>180</Text>
  </View>
  
  <View style={styles.sliderButtons}>
    {[15, 30, 45, 60, 90, 120, 180].map(min => {
      const estaActivo = preferenciasRecomendacion.tiempoMaximo === min;
      return (
        <TouchableOpacity 
          key={min} 
          style={[
            styles.sliderBtn, 
            estaActivo && styles.sliderBtnActive,
            { 
              backgroundColor: estaActivo 
                ? '#3f7c78ff' 
                : temaActual.borde,
              borderColor: estaActivo 
                ? (modoOscuro ? '#FFFFFF' : '#2C3E50')
                : 'transparent',
              borderWidth: estaActivo ? 2 : 1,
            }
          ]}
          onPress={() => setPreferenciasRecomendacion(prev => ({ ...prev, tiempoMaximo: min }))}
        >
          <Text style={[
            styles.sliderBtnText, 
            estaActivo && styles.sliderBtnTextActive,
            { 
              color: estaActivo 
                ? 'white' 
                : temaActual.textoSubtitulo,
              fontWeight: estaActivo ? 'bold' : '600'
            }
          ]}>
            {min} min
          </Text>
        </TouchableOpacity>
      );
    })}
  </View>
</View>
              
              {/* Preferencias especiales */}
<View style={styles.recomendacionItem}>
  <Text style={[styles.recomendacionLabel, { color: modoOscuro ? '#FFFFFF' : '#2C3E50' }]}>
    ⭐ Preferencias especiales:
  </Text>
  <View style={styles.preferenciasGrid}>
    {[
      { id: 'sinGluten', label: 'Sin Gluten', icon: '🌾' },
      { id: 'vegetariano', label: 'Vegetariano', icon: '🌱' },
      { id: 'vegano', label: 'Vegano', icon: '🌿' },
      { id: 'saludable', label: 'Saludable', icon: '🥗' },
      { id: 'rapido', label: 'Rápido (<30 min)', icon: '⚡' },
    ].map(pref => {
      const estaActivo = preferenciasRecomendacion[pref.id];
      
      // COLORES PARA MODO DÍA CON CONTRASTE
      let colorFondo, colorBorde, colorTexto;
      
      if (modoOscuro) {
        colorFondo = estaActivo ? '#3f7c78ff' : '#2D2D2D';
        colorBorde = estaActivo ? '#FFFFFF' : '#444444';
        colorTexto = estaActivo ? '#FFFFFF' : '#B0B0B0';
      } else {
        // MODO DÍA: Borde NARANJA para destacar
        colorFondo = estaActivo ? '#3f7c78ff' : '#f5f5f5';
        colorBorde = estaActivo ? '#FF6B35' : '#d0d0d0'; // NARANJA brillante
        colorTexto = estaActivo ? '#FFFFFF' : '#555555';
      }
      
      return (
        <TouchableOpacity
          key={pref.id}
          style={[
            styles.preferenciaBtn,
            estaActivo && styles.preferenciaBtnActive,
            {
              backgroundColor: colorFondo,
              borderColor: colorBorde,
              borderWidth: estaActivo ? 3 : 1,
              borderRadius: 20,
              elevation: estaActivo ? 4 : 1,
              shadowColor: '#000',
              shadowOffset: estaActivo ? { width: 0, height: 3 } : { width: 0, height: 1 },
              shadowOpacity: estaActivo ? 0.3 : 0.1,
              shadowRadius: estaActivo ? 4 : 2,
              transform: estaActivo ? [{ scale: 1.05 }] : [{ scale: 1 }],
            }
          ]}
          onPress={() => setPreferenciasRecomendacion(prev => ({
            ...prev,
            [pref.id]: !prev[pref.id]
          }))}
        >
          <Text style={[
            styles.preferenciaText,
            estaActivo && styles.preferenciaTextActive,
            {
              color: colorTexto,
              fontWeight: estaActivo ? 'bold' : '600',
              fontSize: 14,
              textShadowColor: estaActivo ? 'rgba(0, 0, 0, 0.2)' : 'transparent',
              textShadowOffset: estaActivo ? { width: 1, height: 1 } : { width: 0, height: 0 },
              textShadowRadius: estaActivo ? 2 : 0,
            }
          ]}>
            {pref.icon} {pref.label}
          </Text>
        </TouchableOpacity>
      );
    })}
  </View>
</View>
              
              {/* Contador de preferencias */}
              <View style={styles.contadorPreferencias}>
                <Text style={[styles.contadorTexto, { color: temaActual.textoSubtitulo }]}>
                  Preferencias seleccionadas: {
                    (preferenciasRecomendacion.categoria ? 1 : 0) +
                    Object.values(preferenciasRecomendacion).filter(val => val === true).length - 1
                  }
                </Text>
              </View>
            </View>
            
            {/* Recomendaciones generadas */}
            {recomendaciones.length > 0 && (
              <View style={styles.recomendacionesGrupo}>
                <Text style={[styles.recomendacionTitulo, { color: temaActual.texto }]}>
                  🍽️ Recetas Recomendadas ({recomendaciones.length})
                </Text>
                {recomendaciones.map((receta, index) => (
                  <TouchableOpacity
                    key={receta.id}
                    style={[
                      styles.recomendacionCard,
                      { 
  backgroundColor: modoOscuro ? temaActual.fondoCard : '#e1e1e1ff',
  borderLeftColor: receta.color,
  borderWidth: 1,
  borderColor: modoOscuro ? temaActual.borde : '#d1d1d1',
}
                    ]}
                    onPress={() => {
                      setMostrarRecomendador(false);
                      setTimeout(() => mostrarDetalleReceta(receta), 300);
                    }}
                  >
                    <View style={styles.recomendacionCardHeader}>
                      <Text style={[styles.recomendacionCardTitulo, { color: temaActual.texto }]}>
                        #{index + 1}. {receta.nombre}
                      </Text>
                      <Text style={[styles.recomendacionCardCategoria, { color: temaActual.textoSubtitulo }]}>
                        {receta.categoria}
                      </Text>
                    </View>
                    <View style={styles.recomendacionCardInfo}>
                      <Text style={[styles.recomendacionCardInfoItem, { color: temaActual.textoSubtitulo }]}>
                        ⏱️ {receta.tiempo}
                      </Text>
                      <Text style={[styles.recomendacionCardInfoItem, { color: temaActual.textoSubtitulo }]}>
                        📊 {receta.dificultad}
                      </Text>
                    </View>
                  </TouchableOpacity>
                ))}
              </View>
            )}
          </ScrollView>
          
          <View style={[styles.modalRecomendacionFooter, { borderTopColor: temaActual.borde }]}>
            <TouchableOpacity 
              style={styles.botonRecomendacionSecundario}
              onPress={resetearPreferencias}
            >
              <Text style={styles.botonRecomendacionSecundarioTexto}>🔄 Reiniciar</Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={styles.botonRecomendacionAleatorio}
              onPress={() => generarRecomendaciones(false)}
            >
              <Text style={styles.botonRecomendacionAleatorioTexto}>🎲 Aleatorio</Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={styles.botonRecomendacionPrincipal}
              onPress={() => generarRecomendaciones(true)}
            >
              <Text style={styles.botonRecomendacionPrincipalTexto}>🎯 Personalizado</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );

    // Renderizar modal de detalle de receta
  const RenderModalDetalle = () => {
    if (!recetaDetalle) return null;

    return (
      <Modal
        animationType="slide"
        transparent={false}
        visible={modalVisible}
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={[styles.modalContainer, { backgroundColor: temaActual.fondo }]}>
          <ScrollView style={styles.modalScroll}>
            <View style={[styles.modalHeader, { backgroundColor: recetaDetalle.color }]}>
              <TouchableOpacity 
                style={styles.botonCerrar}
                onPress={() => setModalVisible(false)}
              >
                <Text style={styles.botonCerrarTexto}>← Volver</Text>
              </TouchableOpacity>
              
              <Text style={styles.modalTitulo}>{recetaDetalle.nombre}</Text>
              
              <TouchableOpacity 
                onPress={() => guardarFavorito(recetaDetalle.id)}
                style={styles.favoritoModal}
              >
                <Text style={styles.favoritoIconoGrande}>
                  {recetaDetalle.esFavorita ? '❤️' : '🤍'}
                </Text>
              </TouchableOpacity>
            </View>
            
            <View style={styles.modalContent}>
              <View style={[styles.detalleInfo, { backgroundColor: temaActual.fondoCard }]}>
                <View style={[styles.detalleInfoItem, { borderBottomColor: temaActual.borde }]}>
                  <Text style={[styles.detalleInfoLabel, { color: temaActual.textoSubtitulo }]}>⏱️ Tiempo:</Text>
                  <Text style={[styles.detalleInfoValor, { color: temaActual.texto }]}>{recetaDetalle.tiempo}</Text>
                </View>
                
                {/* Continúa actualizando el resto del modal de detalle... */}
                
                <View style={styles.detalleInfoItem}>
                  <Text style={styles.detalleInfoLabel}>{"\u{23F1}\u{FE0F}"} Dificultad:</Text>
                  <Text style={[
                    styles.detalleInfoValor,
                    recetaDetalle.dificultad === 'Fácil' && styles.facil,
                    recetaDetalle.dificultad === 'Media' && styles.media,
                    recetaDetalle.dificultad === 'Difícil' && styles.dificil
                  ]}>
                    {recetaDetalle.dificultad}
                  </Text>
                </View>
                
                <View style={styles.detalleInfoItem}>
                  <Text style={styles.detalleInfoLabel}>{"\u{1F465}"} Porciones:</Text>
                  <Text style={styles.detalleInfoValor}>{recetaDetalle.porciones}</Text>
                </View>
                
                <View style={styles.detalleInfoItem}>
                  <Text style={styles.detalleInfoLabel}>{"\u{1F4C2}"} Categoría:</Text>
                  <Text style={styles.detalleInfoValor}>{recetaDetalle.categoria}</Text>
                </View>
              </View>
              
              <Text style={[styles.seccionTituloModal, { color: modoOscuro ? '#FFFFFF' : '#2C3E50' }]}>
  {"\u{1F4DD}"} Descripción
</Text>
<View style={[
  styles.descripcionContainer,
  { 
    backgroundColor: modoOscuro ? 'rgba(255, 255, 255, 0.05)' : 'rgba(255, 255, 255, 0.9)',
    borderColor: modoOscuro ? '#555555' : '#d0d0d0',
    borderWidth: 2,
    borderLeftWidth: 4,
    borderLeftColor: recetaDetalle.color || '#4ECDC4',
  }
]}>
  <Text style={[
    styles.descripcion, 
    { color: modoOscuro ? '#F0F0F0' : '#333333' }
  ]}>
    {recetaDetalle.descripcion}
  </Text>
</View>

<Text style={[styles.seccionTituloModal, { color: modoOscuro ? '#FFFFFF' : '#2C3E50' }]}>
  {"\u{1F6D2}"} Ingredientes
</Text>
<View style={[
  styles.ingredientesContainer,
  { 
    backgroundColor: modoOscuro ? 'rgba(40, 40, 40, 0.8)' : 'rgba(255, 255, 255, 0.95)',
    borderColor: modoOscuro ? '#555555' : '#d0d0d0',
    borderWidth: 2,
  }
]}>
  {recetaDetalle.ingredientes.map((ingrediente, index) => (
    <View key={index} style={[
      styles.itemLista,
      index !== recetaDetalle.ingredientes.length - 1 && {
        borderBottomWidth: 1,
        borderBottomColor: modoOscuro ? '#444444' : '#f0f0f0',
        paddingBottom: 10,
        marginBottom: 10,
      }
    ]}>
      <Text style={[
        styles.itemListaIcono,
        { color: recetaDetalle.color || (modoOscuro ? '#4ECDC4' : '#3f7c78ff') }
      ]}>•</Text>
      <Text style={[
        styles.itemListaTexto,
        { color: modoOscuro ? '#E0E0E0' : '#333333' }
      ]}>
        {ingrediente}
      </Text>
    </View>
  ))}
</View>

<Text style={[styles.seccionTituloModal, { color: modoOscuro ? '#FFFFFF' : '#2C3E50' }]}>
  {"\u{1F468}\u{200D}\u{1F373}"} Preparación
</Text>
{recetaDetalle.preparacion.map((paso, index) => (
  <View key={index} style={[
    styles.pasoContainer, 
    { 
      backgroundColor: modoOscuro 
        ? 'rgba(122, 175, 177, 0.15)' 
        : 'rgba(255, 255, 255, 0.95)',
      borderColor: recetaDetalle.color || (modoOscuro ? '#74a09dff' : '#5ca6a1ff'),
      borderWidth: 2,
      borderLeftWidth: 5,
      borderLeftColor: recetaDetalle.color || '#4ECDC4',
      elevation: 2,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: modoOscuro ? 0.2 : 0.1,
      shadowRadius: 3,
    }
  ]}>
    <View style={[
      styles.pasoNumero, 
      { 
        backgroundColor: recetaDetalle.color || '#4ECDC4',
        width: 34,
        height: 34,
        borderRadius: 17,
        elevation: 3,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.3,
        shadowRadius: 3,
      }
    ]}>
      <Text style={styles.pasoNumeroTexto}>{index + 1}</Text>
    </View>
    <Text style={[
      styles.pasoTexto, 
      { color: modoOscuro ? '#F0F0F0' : '#333333' }
    ]}>
      {paso}
    </Text>
  </View>
))}
              
              {recetaDetalle.tags && recetaDetalle.tags.length > 0 && (
  <>
    <Text style={styles.seccionTituloModal}>{"\u{1F3F7}\u{FE0F}"} Características</Text>
    <View style={styles.tagsContainerModal}>
      {recetaDetalle.tags.map((tag, index) => (
        <View key={index} style={styles.tagModal}>
          <Text style={styles.tagTextModal}>{tag}</Text>
        </View>
      ))}
    </View>
  </>
)}
            </View>
          </ScrollView>
        </View>
      </Modal>
    );
  };

  // Renderizar categorías
  const RenderCategoria = ({ categoria }) => (
    <TouchableOpacity
      style={[
        styles.categoriaBoton,
        { backgroundColor: categoria.color },
        categoriaSeleccionada === categoria.id && styles.categoriaBotonActivo
      ]}
      onPress={() => setCategoriaSeleccionada(categoria.id)}
    >
      <Text style={styles.categoriaIcono}>{categoria.icono}</Text>
      <Text style={styles.categoriaTexto}>{categoria.nombre}</Text>
    </TouchableOpacity>
  );

  // Contar filtros activos para mostrar en badge
  const filtrosActivosCount = 
    filtrosAlergenos.filter(a => a.activo).length +
    filtrosTags.filter(t => t.activo).length +
    (tiempoMaximo < 240 ? 1 : 0) +
    (dificultadFiltro.length < 3 ? 1 : 0);

  return (
        <View style={[styles.container, { backgroundColor: temaActual.fondo }]}>
      <StatusBar backgroundColor={temaActual.fondoHeader} barStyle="light-content" />
      
            {/* HEADER */}
      <View style={[styles.header, { backgroundColor: temaActual.fondoHeader }]}>
        <Text style={styles.titulo}>¿Qué podemos cocinar?</Text>
        <View style={styles.headerFila}>
          <Text style={styles.subtitulo}>Recetas tradicionales y saludables</Text>
          {/* BOTÓN THEMES */}
          <ThemeSelector
            themeName={themeName}
            mode={mode}
            setThemeName={setThemeName}
            setMode={setMode}
          />
        </View>
      </View>

      {/* BARRA DE NAVEGACIÓN */}
          <View style={[styles.navBar, { backgroundColor: temaActual.fondoCard }]}>
        <TouchableOpacity 
          style={[
            styles.navButton, 
            pantallaActual === 'inicio' && [styles.navButtonActive, { backgroundColor: temaActual.fondoNav }]
          ]}
          onPress={() => setPantallaActual('inicio')}
        >
          <Text style={[styles.navText, pantallaActual === 'inicio' && styles.navTextActive]}>
            🏠 Inicio
          </Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={[
            styles.navButton, 
            pantallaActual === 'favoritos' && [styles.navButtonActive, { backgroundColor: temaActual.fondoNav }]
          ]}
          onPress={() => setPantallaActual('favoritos')}
        >
          <Text style={[styles.navText, pantallaActual === 'favoritos' && styles.navTextActive]}>
            ❤️ Favoritos ({favoritos.length})
          </Text>
        </TouchableOpacity>
        
        {/* BOTÓN DE RECOMENDACIÓN */}
        <TouchableOpacity 
          style={[
            styles.navButton, 
            pantallaActual === 'recomendacion' && [styles.navButtonActive, { backgroundColor: temaActual.fondoNav }]
          ]}
          onPress={() => {
            setPreferenciasRecomendacion({
              categoria: categoriaSeleccionada !== 'todas' ? categoriaSeleccionada : '',
              tiempoMaximo: tiempoMaximo < 240 ? tiempoMaximo : 60,
              sinGluten: filtrosAlergenos.find(a => a.id === 'gluten')?.activo || false,
              vegetariano: filtrosTags.find(t => t.id === 'vegetariano')?.activo || false,
              vegano: filtrosTags.find(t => t.id === 'vegano')?.activo || false,
              saludable: filtrosTags.find(t => t.id === 'saludable')?.activo || false,
              rapido: filtrosTags.find(t => t.id === 'rapido')?.activo || false
            });
            generarRecomendaciones(true);
          }}
        >
          <Text style={[styles.navText, pantallaActual === 'recomendacion' && styles.navTextActive]}>
            🎯 Recomendar
          </Text>
        </TouchableOpacity>
      </View>

      {/* BARRA DE BÚSQUEDA Y FILTROS */}
      <View style={styles.barraSuperior}>
                        <View style={[styles.barraBusqueda, { 
          backgroundColor: temaActual.fondoCard,
          borderColor: temaActual.borde 
        }]}>
          <TextInput
            style={[styles.inputBusqueda, { color: temaActual.textoInput }]}
            placeholder="🔍 Buscar recetas..."
            placeholderTextColor={modoOscuro ? '#888' : '#999'}
            value={busqueda}
            onChangeText={setBusqueda}
          />
        </View>
        
        {/* 🔥 BOTÓN DE FILTROS AVANZADOS */}
        <TouchableOpacity 
          style={styles.botonFiltros}
          onPress={() => setMostrarFiltros(true)}
        >
          <Text style={styles.botonFiltrosTexto}>⚙️ Filtros</Text>
          {filtrosActivosCount > 0 && (
            <View style={styles.badgeFiltros}>
              <Text style={styles.badgeText}>{filtrosActivosCount}</Text>
            </View>
          )}
        </TouchableOpacity>
      </View>

      {/* CATEGORÍAS */}
      <View style={styles.categoriasContainer}>
        <ScrollView 
          horizontal 
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.categoriasScroll}
        >
          {CATEGORIAS.map((categoria) => (
            <RenderCategoria key={categoria.id} categoria={categoria} />
          ))}
        </ScrollView>
      </View>

     {/* CONTENIDO PRINCIPAL */}
<View style={styles.contenido}>
  <View style={styles.headerContenido}>
    <Text style={[styles.seccionTitulo, { color: temaActual.texto }]}>
      {pantallaActual === 'inicio' 
        ? categoriaSeleccionada === 'todas' 
          ? 'Todas las recetas' 
          : `Recetas de ${CATEGORIAS.find(c => c.id === categoriaSeleccionada)?.nombre}`
        : 'Mis Favoritas'
      }
    </Text>
  </View>
  {/* CONTADOR CON BOTONES DE PAGINACIÓN */}
    <View style={styles.contadorConBotones}>
      {/* Botón página anterior */}
      <TouchableOpacity 
        style={[
          styles.botonPaginaMini,
          (paginaActual === 1 || pantallaActual !== 'inicio') && styles.botonPaginaMiniDeshabilitado
        ]}
        onPress={paginaAnterior}
        disabled={paginaActual === 1 || pantallaActual !== 'inicio'}
      >
        <Text style={[
          styles.botonPaginaMiniTexto,
          (paginaActual === 1 || pantallaActual !== 'inicio') && styles.botonPaginaMiniTextoDeshabilitado
        ]}>
          ◀
        </Text>
      </TouchableOpacity>
      
      {/* Contador */}
      <Text style={[styles.contadorRecetas, { color: temaActual.textoSubtitulo }]}>
        {pantallaActual === 'inicio' 
          ? `(${recetasFiltradasCompletas.length} recetas - Pág ${paginaActual}/${totalPaginas})`
          : `(${recetasFavoritas.length})`
        }
      </Text>
      
      {/* Botón página siguiente */}
      <TouchableOpacity 
        style={[
          styles.botonPaginaMini,
          (paginaActual === totalPaginas || pantallaActual !== 'inicio') && styles.botonPaginaMiniDeshabilitado
        ]}
        onPress={siguientePagina}
        disabled={paginaActual === totalPaginas || pantallaActual !== 'inicio'}
      >
        <Text style={[
          styles.botonPaginaMiniTexto,
          (paginaActual === totalPaginas || pantallaActual !== 'inicio') && styles.botonPaginaMiniTextoDeshabilitado
        ]}>
          ▶
        </Text>
      </TouchableOpacity>
    </View>
  
  {pantallaActual === 'inicio' ? 
    (
      recetasFiltradasPaginadas.length > 0 ? (
        <>
          <FlatList
            ref={listaRef}
            data={recetasFiltradasPaginadas}
            renderItem={({ item, index }) => (
              <RecipeCard
                item={item}
                index={index}
                paginaActual={paginaActual}
                recetasPorPagina={recetasPorPagina}
                styles={styles}
                modoOscuro={modoOscuro}
                temaActual={temaActual}
                mostrarDetalleReceta={mostrarDetalleReceta}
                guardarFavorito={guardarFavorito}
              />
            )}
            keyExtractor={item => item.id}
            showsVerticalScrollIndicator={true}
            contentContainerStyle={styles.listaGridContenido}
            style={styles.listaContainer}
            numColumns={2}
            columnWrapperStyle={styles.columnWrapper}
            ListFooterComponent={<View style={{ height: 20 }} />}
          />
        
        
      </>
    ) : (
      <View style={styles.vacio}>
        <Text style={styles.vacioIcono}>🍽️</Text>
        <Text style={styles.vacioTexto}>No se encontraron recetas</Text>
        <Text style={styles.vacioSubtexto}>
          {filtrosActivosCount > 0 
            ? 'Prueba con menos filtros' 
            : 'Intenta con otra búsqueda'}
        </Text>
        <TouchableOpacity 
          style={styles.botonRecomendacionVacio}
          onPress={() => generarRecomendaciones(false)}
        >
          <Text style={styles.botonRecomendacionVacioTexto}>
            🎲 ¿Necesitas inspiración? Prueba recetas aleatorias
          </Text>
        </TouchableOpacity>
      </View>
    )
  ) : recetasFavoritas.length > 0 ? (
  <FlatList
    data={recetasFavoritas}
    renderItem={({ item, index }) => (
      <RecipeCard
        item={item}
        index={index}
        paginaActual={paginaActual}
        recetasPorPagina={recetasPorPagina}
        styles={styles}
        modoOscuro={modoOscuro}
        temaActual={temaActual}
        mostrarDetalleReceta={mostrarDetalleReceta}
        guardarFavorito={guardarFavorito}
      />
    )}
    keyExtractor={item => item.id}
    showsVerticalScrollIndicator={false}
    contentContainerStyle={styles.listaContenido}
  />
                ) : (
          <View style={styles.vacio}>
            <Text style={styles.vacioIcono}>❤️</Text>
            <Text style={styles.vacioTexto}>No tienes recetas favoritas</Text>
            <Text style={styles.vacioSubtexto}>Toca el corazón en las recetas</Text>
            <TouchableOpacity 
              style={styles.botonRecomendacionVacio}
              onPress={() => generarRecomendaciones(false)}
            >
              <Text style={styles.botonRecomendacionVacioTexto}>
                🎲 ¿No sabes por dónde empezar? Prueba recetas aleatorias
              </Text>
            </TouchableOpacity>
          </View>
        )}
      </View>

            

      {/* MODALES */}
      <ModalFiltros
        visible={mostrarFiltros}
        onClose={() => setMostrarFiltros(false)}

        styles={styles}
        temaActual={temaActual}

        tiempoMaximo={tiempoMaximo}
        setTiempoMaximo={setTiempoMaximo}

        dificultadFiltro={dificultadFiltro}
        setDificultadFiltro={setDificultadFiltro}

        filtrosAlergenos={filtrosAlergenos}
        toggleAlergeno={toggleAlergeno}

        filtrosTags={filtrosTags}
        toggleTag={toggleTag}

        limpiarFiltros={limpiarFiltros}
      />

      <RenderModalRecomendacion />
      <RenderModalDetalle />
    </View>
  );
}