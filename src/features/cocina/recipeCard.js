import { View, Text, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

export default function RecipeCard({
  item,
  index,
  paginaActual,
  recetasPorPagina,
  styles,
  modoOscuro,
  temaActual,
  mostrarDetalleReceta,
  guardarFavorito,
}) {
  // Calcular número absoluto de receta
  const numeroAbsoluto =
    ((paginaActual - 1) * recetasPorPagina) + (index + 1);

  return (
    <TouchableOpacity 
      style={[
        styles.tarjetaRecetaGrid, 
        { 
          backgroundColor: modoOscuro ? temaActual.fondoCard : '#ffffff',
          borderLeftColor: item.color,
          shadowColor: temaActual.sombra,
          borderColor: modoOscuro ? temaActual.borde : '#f0f0f0',
        }
      ]}
      onPress={() => mostrarDetalleReceta(item)}
      activeOpacity={0.7}
    >
      <View style={styles.tarjetaHeader}>
        <Text
          style={[
            styles.tarjetaNombre,
            { color: modoOscuro ? temaActual.texto : '#2a2a2a' }
          ]}
          numberOfLines={2}
        >
          {item.nombre}
        </Text>

        <TouchableOpacity
          onPress={(e) => {
            e.stopPropagation();
            guardarFavorito(item.id);
          }}
          style={styles.favoritoBoton}
        >
                  <Ionicons
          name={item.esFavorita ? 'heart' : 'heart-outline'}
          size={20}
          color={item.esFavorita ? '#e74c3c' : temaActual.textoSubtitulo}
        />

        </TouchableOpacity>
      </View>

      <Text
        style={[
          styles.tarjetaDescripcion,
          { color: modoOscuro ? temaActual.textoSubtitulo : '#000000ff' }
        ]}
        numberOfLines={2}
      >
        {item.descripcion}
      </Text>

      <View style={[styles.tarjetaInfo, { borderTopColor: temaActual.borde }]}>
        <View style={styles.infoItem}>
          <Ionicons
            name="time"
            size={14}
            color={modoOscuro ? '#CCCCCC' : temaActual.textoSubtitulo}
          />

          <Text style={[styles.infoValor, { color: modoOscuro ? '#FFFFFF' : temaActual.texto }]}>{item.tiempo}</Text>
        </View>

        <View style={styles.infoItem}>
          <Ionicons
            name="bar-chart"
            size={14}
            color={modoOscuro ? '#CCCCCC' : temaActual.textoSubtitulo}
          />

          <Text
            style={[
              styles.infoValor,
              { color: modoOscuro ? '#FFFFFF' : temaActual.texto },
              item.dificultad === 'Fácil' && styles.facil,
              item.dificultad === 'Media' && styles.media,
              item.dificultad === 'Difícil' && styles.dificil
            ]}
          >
            {item.dificultad}
          </Text>
        </View>

        <View style={styles.infoItem}>
          <Ionicons
            name="folder-outline"
            size={14}
            color={modoOscuro ? '#CCCCCC' : temaActual.textoSubtitulo}
          />
          <Text style={[styles.infoValor, { color: modoOscuro ? '#FFFFFF' : temaActual.texto }]}>{item.categoria}</Text>
        </View>
      </View>

      {item.tags && item.tags.length > 0 && (
        <View style={styles.tagsContainer}>
          {item.tags.slice(0, 3).map((tag, tagIndex) => (
            <View key={tagIndex} style={[styles.tag, { backgroundColor: temaActual.borde }]}>
              <Text style={[styles.tagText, { color: temaActual.textoSubtitulo }]}>{tag}</Text>
            </View>
          ))}
        </View>
      )}

      <View
        style={[
          styles.numeroRecetaContainer,
          { backgroundColor: item.color || temaActual.borde }
        ]}
      >
        <Text style={styles.numeroRecetaTexto}>#{numeroAbsoluto}</Text>
      </View>
    </TouchableOpacity>
  );
}
