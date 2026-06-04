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
import { saveTask } from '../storage/database';
import RecipeCard from '../../cocina/recipeCard';
import ModalFiltros from '../../cocina/ModalFiltros';
import ModalRecomendacion from '../../cocina/ModalRecomendacion';
import { Ionicons } from '@expo/vector-icons';
import { MaterialCommunityIcons as MCI} from '@expo/vector-icons';


// ==================== COMPONENTE PRINCIPAL ====================
export default function CookScreen({themeName, mode, setThemeName, setMode, onTaskCreated}) {
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

const crearTareaDesdeReceta = async (receta) => {
  try {
    const today = new Date();
    const dateStr = `${today.getFullYear()}-${(today.getMonth() + 1)
      .toString()
      .padStart(2, "0")}-${today.getDate().toString().padStart(2, "0")}`;

    const newTask = {
      id: Date.now().toString(),
      title: `Preparar ${receta.nombre}`,
      description: `Receta: ${receta.nombre}`,
      done: false,

      categoryId: "cocina", // o el id real de tu categoría
      date: dateStr,
      time: null,

      repeat_mode: "none",
      repeat_days: null,
      repeat_end: null,
      reminder_minutes: null,

      subtasks: [],
    };

    await saveTask(newTask);

    onTaskCreated?.();

    setModalVisible(false);
  } catch (e) {
    console.error("Error creando tarea desde receta", e);
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
  
  {/* IZQUIERDA — VOLVER */}
  <View style={styles.headerSide}>
    <TouchableOpacity
      onPress={() => setModalVisible(false)}
      style={{ flexDirection: 'row', alignItems: 'center' }}
    >
      <Ionicons name="arrow-back-outline" size={20} color="#fff" />
    </TouchableOpacity>
  </View>

  {/* CENTRO — TÍTULO */}
  <View style={styles.headerCenter}>
    <Text
      style={styles.modalTitulo}
      numberOfLines={2}
      ellipsizeMode="tail"
    >
      {recetaDetalle.nombre}
    </Text>
  </View>

{/* DERECHA — ACCIONES */}
<View style={[styles.headerSide, { flexDirection: "row", gap: 14 }]}>
  {/* Crear tarea */}
  <TouchableOpacity
    onPress={() => crearTareaDesdeReceta(recetaDetalle)}
  >
    <Ionicons
      name="time-outline"
      size={22}
      color="#fff"
    />
  </TouchableOpacity>

  {/* Favorito */}
  <TouchableOpacity
    onPress={() => guardarFavorito(recetaDetalle.id)}
  >
    <Ionicons
      name={recetaDetalle.esFavorita ? 'heart' : 'heart-outline'}
      size={24}
      color="#fff"
    />
  </TouchableOpacity>
</View>

</View>

            
            <View style={styles.modalContent}>
              <View style={[styles.detalleInfo, { backgroundColor: temaActual.fondoCard }]}>
<View style={styles.detalleInfoItem}>
  <View style={styles.detalleInfoLeft}>
    <Ionicons
      name="time-outline"
      size={16}
      color={temaActual.textoSubtitulo}
    />
    <Text style={styles.detalleInfoLabel}>Tiempo:</Text>
  </View>

  <Text style={styles.detalleInfoValor}>
    {recetaDetalle.tiempo}
  </Text>
</View>
                
                {/* Continúa actualizando el resto del modal de detalle... */}
                
<View style={styles.detalleInfoItem}>
  <View style={styles.detalleInfoLeft}>
    <Ionicons
      name="bar-chart"
      size={16}
      color={temaActual.textoSubtitulo}
    />
    <Text style={styles.detalleInfoLabel}>Dificultad:</Text>
  </View>

  <Text
    style={[
      styles.detalleInfoValor,
      recetaDetalle.dificultad === 'Fácil' && styles.facil,
      recetaDetalle.dificultad === 'Media' && styles.media,
      recetaDetalle.dificultad === 'Difícil' && styles.dificil,
    ]}
  >
    {recetaDetalle.dificultad}
  </Text>
</View>

                
<View style={styles.detalleInfoItem}>
  <View style={styles.detalleInfoLeft}>
    <Ionicons
      name="people"
      size={16}
      color={temaActual.textoSubtitulo}
    />
    <Text style={styles.detalleInfoLabel}>Porciones:</Text>
  </View>

  <Text style={styles.detalleInfoValor}>
    {recetaDetalle.porciones}
  </Text>
</View>

                
<View style={styles.detalleInfoItem}>
  <View style={styles.detalleInfoLeft}>
    <Ionicons
      name="folder"
      size={16}
      color={temaActual.textoSubtitulo}
    />
    <Text style={styles.detalleInfoLabel}>Categoría:</Text>
  </View>

  <Text style={styles.detalleInfoValor}>
    {recetaDetalle.categoria}
  </Text>
</View>

              </View>
              
<View style={styles.seccionTituloRow}>
  <Ionicons name="document-text-outline" size={20} color={temaActual.texto} />
  <Text style={styles.seccionTituloModal}>Descripción</Text>
</View>
<View style={[
  styles.descripcionContainer,
]}>
  <Text style={[
    styles.descripcion, 
    { color: temaActual.texto }
  ]}>
    {recetaDetalle.descripcion}
  </Text>
</View>

<View style={styles.seccionTituloRow}>
  <Ionicons name="cart-outline" size={18} color={temaActual.texto}/>
  <Text style={styles.seccionTituloModal}>Ingredientes</Text>
</View>
<View style={[
  styles.ingredientesContainer,
  { 
    backgroundColor: temaActual.fondoCard,
    borderColor: temaActual.borde,
    borderWidth: 2,
    borderRadius: 5,
  }
]}>
  {recetaDetalle.ingredientes.map((ingrediente, index) => (
    <View key={index} style={[
      styles.itemLista,
      index !== recetaDetalle.ingredientes.length - 1 && {
        borderBottomWidth: 1,
        borderBottomColor: temaActual.borde + 40,
      }
    ]}>
      <Text style={[
        styles.itemListaIcono,
        { color: temaActual.fondoHeader }
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

<View style={styles.seccionTituloRow}>
  <Ionicons name="restaurant-outline" size={18} color={temaActual.texto}/>
  <Text style={styles.seccionTituloModal}>Preparación</Text>
</View>
{recetaDetalle.preparacion.map((paso, index) => (
  <View key={index} style={[
    styles.pasoContainer, 
    { 
      borderColor: temaActual.borde,
      borderWidth: 2,
      borderLeftWidth: 5,
      borderLeftColor: recetaDetalle.color,
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
<View style={styles.seccionTituloRow}>
  <Ionicons name="pricetag-outline" size={18} color={temaActual.texto}/>
  <Text style={styles.seccionTituloModal}>Características</Text>
</View>
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

const RenderCategoria = ({ categoria }) => (
  <TouchableOpacity
    style={[
      styles.categoriaBoton,
      { backgroundColor: categoria.color },
      categoriaSeleccionada === categoria.id && styles.categoriaBotonActivo
    ]}
    onPress={() => setCategoriaSeleccionada(categoria.id)}
  >
    <MCI
      name={categoria.icono}
      size={18}
      color="#fff"
      style={styles.categoriaIcono}
    />

    <Text style={styles.categoriaTexto}>
      {categoria.nombre}
    </Text>
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
          <Ionicons
            name="home-outline"
            size={18}
            color={temaActual.texto}
          />
          <Text style={[styles.navText, pantallaActual === 'inicio' && styles.navTextActive]}>
            Inicio
          </Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={[
            styles.navButton, 
            pantallaActual === 'favoritos' && [styles.navButtonActive, { backgroundColor: temaActual.fondoNav }]
          ]}
          onPress={() => setPantallaActual('favoritos')}
        >
          <Ionicons
            name="heart"
            size={18}
            color={
              pantallaActual === 'favoritos'
                ? 'red'
                : temaActual.texto
            }
          />
          <Text style={[styles.navText, pantallaActual === 'favoritos' && styles.navTextActive]}>
            Favoritos ({favoritos.length})
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
          <Ionicons
            name='sparkles'
            size={18}
            color={modoOscuro ? 'yellow' : 'orange'}
          />
          <Text style={[styles.navText, pantallaActual === 'recomendacion' && styles.navTextActive]}>
            Recomendar
          </Text>
        </TouchableOpacity>
      </View>

      {/* BARRA DE BÚSQUEDA Y FILTROS */}
      <View style={styles.barraSuperior}>
                        <View style={[styles.barraBusqueda, { 
          backgroundColor: temaActual.fondoCard,
          borderColor: temaActual.borde 
        }]}>
          <Ionicons
            name="search-outline"
            size={18}
            color={temaActual.texto}
            style={{ marginRight: 8 }}
          />
          <TextInput
            style={[styles.inputBusqueda, { color: temaActual.textoInput }]}
            placeholder="Buscar recetas..."
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
            <Ionicons
              name="options-outline"
              size={18}
              color={'white'}
              style={{ marginRight: 6 }}
            />
          <Text style={styles.botonFiltrosTexto}>Filtros</Text>
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
  <Ionicons
    name="restaurant-outline"
    size={56}
    color={temaActual.textoSubtitulo}
    style={{ marginBottom: 12 }}
  />

  <Text style={[styles.vacioTexto, { color: temaActual.texto }]}>
    No se encontraron recetas
  </Text>

  <Text style={[styles.vacioSubtexto, { color: temaActual.textoSubtitulo }]}>
    {filtrosActivosCount > 0
      ? 'Prueba con menos filtros'
      : 'Intenta con otra búsqueda'}
  </Text>

  <TouchableOpacity
    style={styles.botonRecomendacionVacio}
    onPress={() => generarRecomendaciones(false)}
  >
    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
      <Ionicons
        name="shuffle-outline"
        size={16}
        color="#fff"
        style={{ marginRight: 6 }}
      />
      <Text style={styles.botonRecomendacionVacioTexto}>
        Prueba recetas aleatorias
      </Text>
    </View>
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
  <Ionicons
    name="heart-outline"
    size={56}
    color={temaActual.textoSubtitulo}
    style={{ marginBottom: 12 }}
  />

  <Text style={[styles.vacioTexto, { color: temaActual.texto }]}>
    No tienes recetas favoritas
  </Text>

  <Text style={[styles.vacioSubtexto, { color: temaActual.textoSubtitulo }]}>
    Toca el corazón en las recetas para guardarlas aquí
  </Text>

  <TouchableOpacity
    style={styles.botonRecomendacionVacio}
    onPress={() => generarRecomendaciones(false)}
  >
    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
      <Ionicons
        name="shuffle-outline"
        size={16}
        color="#fff"
        style={{ marginRight: 6 }}
      />
      <Text style={styles.botonRecomendacionVacioTexto}>
        Prueba recetas aleatorias
      </Text>
    </View>
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

<ModalRecomendacion
  visible={mostrarRecomendador}
  onClose={() => setMostrarRecomendador(false)}
  temaActual={temaActual}
  themeName={themeName}
  mode={mode}
  onSelectReceta={mostrarDetalleReceta}
/>

      <RenderModalDetalle />
    </View>
  );
}