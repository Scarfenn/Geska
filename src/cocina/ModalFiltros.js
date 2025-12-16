import React from "react";
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  ScrollView,
} from "react-native";

const ModalFiltros = React.memo(({
  visible,
  onClose,

  styles,
  temaActual,

  tiempoMaximo,
  setTiempoMaximo,

  dificultadFiltro,
  setDificultadFiltro,

  filtrosAlergenos,
  toggleAlergeno,

  filtrosTags,
  toggleTag,

  limpiarFiltros,
}) => {
  return (
    <Modal
      animationType="slide"
      transparent
      visible={visible}
      onRequestClose={onClose}
    >
      <View style={styles.modalFiltros}>
        <View
          style={[
            styles.modalFiltrosContent,
            { backgroundColor: temaActual.fondoModal },
          ]}
        >
          {/* HEADER */}
          <View
            style={[
              styles.modalFiltrosHeader,
              { borderBottomColor: temaActual.borde },
            ]}
          >
            <Text
              style={[
                styles.modalFiltrosTitulo,
                { color: temaActual.texto },
              ]}
            >
              🔍 Filtros
            </Text>

            <TouchableOpacity onPress={onClose}>
              <Text
                style={[
                  styles.cerrarFiltros,
                  { color: temaActual.textoSubtitulo },
                ]}
              >
                ✕
              </Text>
            </TouchableOpacity>
          </View>

          {/* BODY */}
          <ScrollView style={styles.filtrosScroll}>
            {/* TIEMPO */}
            <View style={styles.filtroGrupo}>
                <Text style={[styles.filtroTitulo, { color: temaActual.texto }]}>
                    ⏱️ Tiempo máximo: {tiempoMaximo} min
                </Text>

                <View style={styles.sliderContainer}>
                    <Text style={styles.sliderMin}> 0 </Text>

                    <View style={styles.sliderTrack}>
                    <View
                        style={[
                        styles.sliderFill,
                        { width: `${(tiempoMaximo / 240) * 100}%` },
                        ]}
                    />
                    </View>

                    <Text style={styles.sliderMax}> 240 </Text>
                </View>

                <View style={styles.sliderButtons}>
                    {[30, 60, 120, 240].map((min) => (
                    <TouchableOpacity
                        key={min}
                        style={[
                        styles.sliderBtn,
                        tiempoMaximo === min && styles.sliderBtnActive,
                        ]}
                        onPress={() => setTiempoMaximo(min)}
                    >
                        <Text
                        style={[
                            styles.sliderBtnText,
                            tiempoMaximo === min && styles.sliderBtnTextActive
                        ]}
                        >
                        {min} min
                        </Text>
                    </TouchableOpacity>
                    ))}
                </View>
                </View>


            {/* DIFICULTAD */}
            <View style={styles.filtroGrupo}>
              <Text style={styles.filtroTitulo}>📊 Dificultad</Text>
              <View style={styles.dificultadContainer}>
                {["Fácil", "Media", "Difícil"].map((diff) => (
                  <TouchableOpacity
                    key={diff}
                    style={[
                      styles.dificultadBtn,
                      dificultadFiltro.includes(diff) &&
                        styles.dificultadBtnActive,
                    ]}
                    onPress={() =>
                      setDificultadFiltro((prev) =>
                        prev.includes(diff)
                          ? prev.filter((d) => d !== diff)
                          : [...prev, diff]
                      )
                    }
                  >
                    <Text
                      style={[
                        styles.dificultadText,
                        dificultadFiltro.includes(diff) &&
                          styles.dificultadTextActive,
                      ]}
                    >
                      {diff}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* ALÉRGENOS */}
            <View style={styles.filtroGrupo}>
              <Text style={styles.filtroTitulo}>
                🚫 Excluir alérgenos
              </Text>

              <View style={styles.filtrosGrid}>
                {filtrosAlergenos.map((a) => (
                  <TouchableOpacity
                    key={a.id}
                    style={[
                      styles.filtroItem,
                      a.activo && styles.filtroItemActive,
                    ]}
                    onPress={() => toggleAlergeno(a.id)}
                  >
                    <Text
                      style={[
                        styles.filtroItemText,
                        a.activo && styles.filtroItemTextActive,
                      ]}
                    >
                      {a.nombre}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* TAGS */}
            <View style={styles.filtroGrupo}>
              <Text style={styles.filtroTitulo}>
                ⭐ Recetas especiales
              </Text>

              <View style={styles.filtrosGrid}>
                {filtrosTags.map((t) => (
                  <TouchableOpacity
                    key={t.id}
                    style={[
                      styles.filtroItem,
                      t.activo && styles.filtroItemActive,
                    ]}
                    onPress={() => toggleTag(t.id)}
                  >
                    <Text
                      style={[
                        styles.filtroItemText,
                        t.activo && styles.filtroItemTextActive,
                      ]}
                    >
                      {t.nombre}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          </ScrollView>

          {/* FOOTER */}
          <View style={styles.modalFiltrosFooter}>
            <TouchableOpacity
              style={styles.botonLimpiar}
              onPress={limpiarFiltros}
            >
              <Text style={styles.botonLimpiarTexto}>
                🔄 Limpiar filtros
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.botonAplicar}
              onPress={onClose}
            >
              <Text style={styles.botonAplicarTexto}>
                ✅ Aplicar filtros
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
});

export default ModalFiltros;
