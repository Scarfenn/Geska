import React, { useState, useCallback, memo } from 'react';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  Alert
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { MaterialCommunityIcons as MCI } from '@expo/vector-icons';
import createStylesC from '@/features/cocina/stylesC';
import { obtenerRecomendacionesAleatorias, obtenerRecomendacionesPersonalizadas } from '@/features/cocina/recomendaciones';
import { CATEGORIAS } from '@/features/cocina/CategoriasC';

/* =========================
        MODAL
========================= */

export default function ModalRecomendacion({
  visible,
  onClose,
  onSelectReceta,
  temaActual,
  themeName, 
  mode,
}) {
  const [categoria, setCategoria] = useState('');
  const [tiempoMaximo, setTiempoMaximo] = useState(60);
  const [recomendaciones, setRecomendaciones] = useState([]);
  const [preferencias, setPreferencias] = useState({
    categoria: '',
    sinGluten: false,
    vegetariano: false,
    vegano: false,
    saludable: false,
    rapido: false,
    tradicional: false,
  });
  const styles = createStylesC(themeName, mode);
  const toggleCategoria = useCallback(
    (id) => setCategoria(prev => (prev === id ? '' : id)),
    []
  );

  const contador =
  (categoria ? 1 : 0) +
  Object.values(preferencias).filter(Boolean).length;

  const togglePreferencia = useCallback(
    (id) => {
      setPreferencias(prev => ({
        ...prev,
        [id]: !prev[id],
      }));
    },
    []
  );

  const cambiarTiempo = useCallback(
    (min) => setTiempoMaximo(min),
    []
  );

  const CategoriasRecomendacion = memo(({
  categoriaActiva,
  onToggle,
}) => (
  <ScrollView horizontal showsHorizontalScrollIndicator={false}>
    {CATEGORIAS.map(cat => {
      const activo = categoriaActiva === cat.id;

      return (
        <TouchableOpacity
          key={cat.id}
          style={[
            styles.filtroItem,
            activo && styles.filtroItemActive,
            { marginHorizontal: 2 },
          ]}
          onPress={() => onToggle(cat.id)}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <MCI name={cat.icono} size={16} color="#fff" />
            <Text style={{ color: '#fff', marginLeft: 4 }}>
              {cat.nombre}
            </Text>
          </View>
        </TouchableOpacity>
      );
    })}
  </ScrollView>
));

const TiempoMaximoSelector = memo(({
  tiempo,
  onChange,
  temaActual,
}) => {
  const valores = [15, 30, 45, 60, 90, 120, 180];


  return (
    <View>
      <View style={styles.sliderButtons}>
        {valores.map(min => {
          const activo = tiempo === min;

          return (
            <TouchableOpacity
              key={min}
              style={[
                styles.filtroItem,
                activo && styles.filtroItemActive,
              ]}
              onPress={() => onChange(min)}
            >
              <Text
                style={{
                  color: activo ? '#fff' : temaActual.textoSubtitulo,
                  fontWeight: activo ? 'bold' : '600',
                }}
              >
                {min} min
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
});

const PreferenciasEspeciales = memo(({
  preferencias,
  onToggle,
  temaActual,
}) => {
  const opciones = [
    { id: 'sinGluten', label: 'Sin Gluten', icon: 'barley-off' },
    { id: 'vegetariano', label: 'Vegetariano', icon: 'leaf' },
    { id: 'vegano', label: 'Vegano', icon: 'sprout' },
    { id: 'saludable', label: 'Saludable', icon: 'heart-pulse' },
    { id: 'rapido', label: 'Rápido (<30 min)', icon: 'flash' },
    { id: 'tradicional', label: 'Tradicional', icon: 'flag' },
  ];

  return (
    <View style={styles.preferenciasGrid}>
      {opciones.map(pref => {
        const activo = preferencias[pref.id];

        return (
          <TouchableOpacity
            key={pref.id}
            style={[
              styles.filtroItem,
              activo && styles.filtroItemActive,
            ]}
            onPress={() => onToggle(pref.id)}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <MCI
                name={pref.icon}
                size={16}
                color={activo ? '#fff' : temaActual.texto}
                style={{ marginRight: 6 }}
              />
              <Text
                style={{
                  color: activo ? '#fff' : temaActual.textoSubtitulo,
                }}
              >
                {pref.label}
              </Text>
            </View>
          </TouchableOpacity>
        );
      })}
    </View>
  );
});
const resetearPreferencias = () => {
    setPreferencias({
      categoria: '',
      tiempoMaximo: 60,
      sinGluten: false,
      vegetariano: false,
      vegano: false,
      saludable: false,
      rapido: false
    });
  };

  const generarRecomendaciones = (personalizadas = false) => {
    if (personalizadas) {
      const recomendacionesPersonalizadas = obtenerRecomendacionesPersonalizadas(preferencias);
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
    
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={styles.modalRecomendacion}>
        <View style={[styles.modalRecomendacionContent, { backgroundColor: temaActual.fondoModal }]}>

          {/* HEADER */}
          <View style={[styles.modalRecomendacionHeader, { borderBottomColor: temaActual.borde }]}>
            <View style={styles.modalRecomendacionHeaderLeft}> 
                <Ionicons name="sparkles" size={20} color={temaActual.texto} /> 
                <Text style={styles.modalRecomendacionTitulo}>Recomendador de Recetas</Text> 
            </View>
            <TouchableOpacity onPress={onClose}>
              <Ionicons name="close" size={20} color={temaActual.textoSubtitulo} />
            </TouchableOpacity>
          </View>

            <ScrollView style={styles.recomendacionScroll}>
            <View style={styles.recomendacionGrupo}>

                {/* TÍTULO GENERAL */}
                <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 12, gap: 6 }}>
                <Ionicons name="list-outline" size={18} color={temaActual.texto} />
                <Text style={[styles.recomendacionTitulo, { color: temaActual.texto }]}>
                    Preferencias de recomendación
                </Text>
                </View>

                {/* CATEGORÍA */}
                <View style={styles.recomendacionItem}>
                <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 6, gap: 6 }}>
                    <Ionicons name="folder" size={16} color={temaActual.texto} />
                    <Text style={[styles.recomendacionLabel, { color: temaActual.texto }]}>
                    Categoría
                    </Text>
                </View>

                <CategoriasRecomendacion
                    styles={styles}
                    categoriaActiva={categoria}
                    onToggle={toggleCategoria}
                />
                </View>

                {/* TIEMPO */}
                <View style={styles.recomendacionItem}>
                <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 6, gap: 6 }}>
                    <Ionicons name="time-outline" size={16} color={temaActual.texto} />
                    <Text style={[styles.recomendacionLabel, { color: temaActual.texto }]}>
                    Tiempo máximo
                    </Text>
                </View>

                <TiempoMaximoSelector
                    styles={styles}
                    tiempo={tiempoMaximo}
                    onChange={cambiarTiempo}
                    temaActual={temaActual}
                />
                </View>

                {/* PREFERENCIAS */}
                <View style={styles.recomendacionItem}>
                <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 6, gap: 6 }}>
                    <Ionicons name="star" size={16} color={temaActual.texto} />
                    <Text style={[styles.recomendacionLabel, { color: temaActual.texto }]}>
                    Preferencias especiales
                    </Text>
                </View>

                <PreferenciasEspeciales
                    styles={styles}
                    preferencias={preferencias}
                    onToggle={togglePreferencia}
                    temaActual={temaActual}
                />
                </View>

                {/* CONTADOR */}
                <View style={styles.contadorPreferencias}>
                <Text style={[styles.contadorTexto, { color: temaActual.textoSubtitulo }]}>
                    Preferencias seleccionadas: {contador}
                </Text>
                </View>

                {recomendaciones.length > 0 && (
  <View style={styles.recomendacionesGrupo}>

    <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
      <Ionicons
        name="restaurant-outline"
        size={18}
        color={temaActual.texto}
        style={{ marginRight: 6 }}
      />
      <Text style={[styles.recomendacionTitulo, { color: temaActual.texto }]}>
        Recetas recomendadas ({recomendaciones.length})
      </Text>
    </View>

    {recomendaciones.map((receta, index) => (
      <TouchableOpacity
        key={receta.id}
        style={[
          styles.recomendacionCard,
          {
            backgroundColor: mode === 'dark'
              ? temaActual.fondoCard
              : '#e1e1e1ff',
            borderLeftColor: receta.color,
            borderWidth: 1,
            borderColor: mode === 'dark'
              ? temaActual.borde
              : '#d1d1d1',
          },
        ]}
        onPress={() => {
          onClose();
          setTimeout(() => {
            onSelectReceta?.(receta);
          }, 300);
        }}
      >
        <View style={styles.recomendacionCardHeader}>
          <Text style={[styles.recomendacionCardTitulo, { color: temaActual.texto }]}>
            #{index + 1}. {receta.nombre}
          </Text>

          <View style={{ flexDirection: 'row', marginTop: 4 }}>
            <Ionicons
              name="time-outline"
              size={14}
              color={temaActual.textoSubtitulo}
            />
            <Text style={{ marginLeft: 4, color: temaActual.textoSubtitulo }}>
              {receta.tiempo}
            </Text>

            <Ionicons
              name="bar-chart-outline"
              size={14}
              color={temaActual.textoSubtitulo}
              style={{ marginLeft: 12 }}
            />
            <Text style={{ marginLeft: 4, color: temaActual.textoSubtitulo }}>
              {receta.dificultad}
            </Text>
          </View>
        </View>
      </TouchableOpacity>
    ))}

  </View>
)}


            </View>
            </ScrollView>
            <View
  style={[
    styles.modalRecomendacionFooter,
    { borderTopColor: temaActual.borde },
  ]}
>
  {/* REINICIAR */}
  <TouchableOpacity
    style={styles.botonRecomendacionSecundario}
    onPress={resetearPreferencias}
  >
    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
      <Ionicons name="refresh-outline" size={14} />
      <Text style={styles.botonRecomendacionSecundarioTexto}>
        Reiniciar
      </Text>
    </View>
  </TouchableOpacity>

  {/* ALEATORIO */}
  <TouchableOpacity
    style={styles.botonRecomendacionAleatorio}
    onPress= {() => generarRecomendaciones(false)} 
  >
    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
      <Ionicons name="shuffle" size={16} color="white" />
      <Text style={styles.botonRecomendacionAleatorioTexto}>
        {' '}Aleatorio
      </Text>
    </View>
  </TouchableOpacity>

  {/* PERSONALIZADO */}
  <TouchableOpacity
    style={styles.botonRecomendacionPrincipal}
        onPress= {() => generarRecomendaciones(true)} 
  >
    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
      <Ionicons name="sparkles" size={14} color="white" />
      <Text style={styles.botonRecomendacionPrincipalTexto}>
        {' '}Personalizado
      </Text>
    </View>
  </TouchableOpacity>
</View>



        </View>
      </View>
    </Modal>
  );
}
