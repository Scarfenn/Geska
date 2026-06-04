import React from "react";
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  ScrollView,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { MaterialCommunityIcons as MCI } from "@expo/vector-icons";

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
            <View style={styles.modalFiltrosHeaderLeft}>
              <Ionicons
                name="search-outline"
                size={20}
                color={temaActual.texto}
                style={{ marginRight: 6 }}
              />
              <Text style={[styles.modalFiltrosTitulo, { color: temaActual.texto }]}>
                Filtros
              </Text>
            </View>

            <TouchableOpacity onPress={onClose}>
              <Ionicons
                name="close"
                size={20}
                color={temaActual.textoSubtitulo}
              />
            </TouchableOpacity>
          </View>

          {/* BODY */}
          <ScrollView style={styles.filtrosScroll}>
            {/* TIEMPO */}
            <View style={styles.filtroGrupo}>
                <View style={styles.filtroTituloRow}>
                  <Ionicons
                    name="time-outline"
                    size={18}
                    color={temaActual.texto}
                    style={{ marginRight: 6 }}
                  />
                  <Text style={[styles.filtroTitulo, { color: temaActual.texto }]}>
                    Tiempo máximo: {tiempoMaximo} min
                  </Text>
                </View>
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
                        styles.filtroItem,
                        tiempoMaximo === min && styles.filtroItemActive,
                        ]}
                        onPress={() => setTiempoMaximo(min)}
                    >
                        <Text
                        style={[
                            styles.filtroItemText,
                            tiempoMaximo === min && styles.filtroItemTextActive
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
              <View style={styles.filtroTituloRow}>
                <Ionicons
                  name="bar-chart"
                  size={18}
                  color={temaActual.texto}
                  style={{ marginRight: 6 }}
                />
                <Text style={styles.filtroTitulo}>Dificultad</Text>
              </View>

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
              <View style={styles.filtroTituloRow}>
                <Ionicons
                  name="ban"
                  size={18}
                  color={temaActual.texto}
                  style={{ marginRight: 6 }}
                />
                <Text style={styles.filtroTitulo}>Excluir alérgenos</Text>
              </View>
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
                  <View style={styles.iconLabel}>
                    <MCI
                      name={a.icono}
                      size={16}
                      color={a.activo ? temaActual.acento : temaActual.texto}
                      style={{ marginRight: 6 }}
                    />
                    <Text
                      style={[
                        styles.filtroItemText,
                        a.activo && styles.filtroItemTextActive,
                      ]}
                    >
                      {a.nombre}
                    </Text>
                  </View>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* TAGS */}
            <View style={styles.filtroGrupo}>
              <View style={styles.filtroTituloRow}>
                <Ionicons
                  name="star"
                  size={18}
                  color={temaActual.texto}
                  style={{ marginRight: 6 }}
                />
                <Text style={styles.filtroTitulo}>Recetas especiales</Text>
              </View>


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
                    <View style={styles.iconLabel}>
                <MCI
                  name={t.icono}
                  size={16}
                  color={t.activo ? temaActual.acento : temaActual.texto}
                  style={{ marginRight: 6 }}
                />
                <Text
                  style={[
                    styles.filtroItemText,
                    t.activo && styles.filtroItemTextActive,
                  ]}
                >
                  {t.nombre}
                </Text>
              </View>

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
              <View style={styles.iconLabel}>
                <Ionicons name="refresh" size={16} color={temaActual.texto} />
                <Text style={styles.botonLimpiarTexto}> Limpiar filtros</Text>
              </View>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.botonAplicar}
              onPress={onClose}
            >
              <View style={styles.iconLabel}>
                <Ionicons name="checkmark" size={16} color="#fff" />
                <Text style={styles.botonAplicarTexto}>Aplicar filtros</Text>
              </View>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
});

export default ModalFiltros;
