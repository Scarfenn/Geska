import { StyleSheet } from "react-native";
import { themes } from "../tasks/styles/themes";
import { Platform } from "react-native";

export default function createStylesC(themeName = "basic", mode = "light") {
const theme = themes[themeName][mode];

return StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  header: {
    backgroundColor: '#D32F2F',
    paddingTop: Platform.OS === 'web' ? 2 : 40,
    paddingBottom: 1,
    paddingHorizontal: 20,
  },
  titulo: {
    fontSize: 30,
    fontWeight: 'bold',
    color: 'white',
    textAlign: 'center',
  },
  subtitulo: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.9)',
    textAlign: 'center',
    marginTop: 4,
  },
  navBar: {
    flexDirection: 'row',
    backgroundColor: theme.background,
    marginHorizontal: 16,
    marginTop: 0,
    borderRadius: 10,
    elevation: 3,
    overflow: 'hidden',
    paddingVertical: 0,
  },
  navButton: {
    flex: 1,
    paddingVertical: 7,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6
  },
  navButtonActive: {
    backgroundColor: '#FF5252',
  },
  navText: {
    fontSize: 15,
    fontWeight: '600',
    color: theme.text,
  },
  navTextActive: {
    color: 'white',
    fontWeight: 'bold',
  },
  barraSuperior: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    marginTop: 12,
    gap: 8,
  },
  barraBusqueda: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'white',
    paddingHorizontal: 14,
    height: 40,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    elevation: 2,
  },
  inputBusqueda: {
    flex: 1,
    alignItems: 'center',
    height: '100%',
    fontSize: 15,
    color: '#333',
  },
  botonFiltros: {
    backgroundColor: theme.primary,
    paddingHorizontal: 10,
    paddingVertical: 10,
    borderRadius: 20,
    flexDirection: 'row',
    alignItems: 'center',
    elevation: 2,
    position: 'relative',
  },
  botonFiltrosTexto: {
    color: 'white',
    fontSize: 15,
    fontWeight: '600',
  },
  badgeFiltros: {
    position: 'absolute',
    top: -8,
    right: -8,
    backgroundColor: '#FF5252',
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  badgeText: {
    color: 'white',
    fontSize: 12,
    fontWeight: 'bold',
  },
  categoriasContainer: {
    height: 50,
    marginTop: 8,
  },
  categoriasScroll: {
    paddingHorizontal: 16,
    alignItems: 'center',
  },
  categoriaBoton: {
  flexDirection: 'row',
  alignItems: 'center',
  paddingHorizontal: 14,         // CAMBIA: 16 → 14
  paddingVertical: 8,            // CAMBIA: 10 → 8
  borderRadius: 18,              // CAMBIA: 20 → 18
  marginRight: 8,                // CAMBIA: 10 → 8
  minWidth: 90,                  // CAMBIA: 100 → 90
  justifyContent: 'center',
  elevation: 2,
},
  categoriaBotonActivo: {
    transform: [{ scale: 1.05 }],
    elevation: 4,
  },
  categoriaIcono: {
  fontSize: 16,                  
  marginRight: 4,
  color: 'white',
},
iconLabel: {
  flexDirection: 'row',
  alignItems: 'center'
},
categoriaTexto: {
  fontSize: 11,                 
  fontWeight: 'bold',
  color: 'white',
  textShadowColor: 'rgba(240, 230, 230, 0.3)',
  textShadowOffset: { width: 0.5, height: 0.5 },
  textShadowRadius: 1,
},
  contenido: {
    flex: 1,
    paddingHorizontal: 16,
    paddingTop: 8,
  },
  headerContenido: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  seccionTitulo: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#2C3E50',
  },
  contadorRecetas: {
    fontSize: 16,
    color: '#7F8C8D',
    fontWeight: '600',
  },
  listaContenido: {
    paddingBottom: 20,
  },
  tarjetaReceta: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    borderLeftWidth: 4,
  },
  tarjetaHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 10,
  },
  tarjetaNombre: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#2C3E50',
    flex: 1,
  },
  favoritoBoton: {
    padding: 4,
    marginLeft: 8,
  },
  favoritoIcono: {
    fontSize: 22,
  },
  tarjetaDescripcion: {
    fontSize: 12,
    color: '#666',
    lineHeight: 20,
    marginBottom: 12,
  },
  tarjetaInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
    marginBottom: 10,
  },
  infoItem: {
    alignItems: 'center',
    flex: 1,
  },
  infoLabel: {
    fontSize: 14,
    color: '#7F8C8D',
    marginBottom: 2,
  },
  infoValor: {
    fontSize: 12,
    textAlign: 'center',
    fontWeight: '600',
    color: '#2C3E50',
  },
  facil: {
    color: '#4CAF50',
  },
  media: {
    color: '#FF9800',
  },
  dificil: {
    color: '#F44336',
  },
  tagsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  tag: {
    backgroundColor: '#f0f0f0',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  tagText: {
    fontSize: 10,
    color: '#666',
    fontWeight: '500',
  },
  vacio: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
  },
  vacioIcono: {
    fontSize: 50,
    marginBottom: 16,
  },
  vacioTexto: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#7F8C8D',
    marginBottom: 8,
    textAlign: 'center',
  },
  vacioSubtexto: {
    fontSize: 14,
    color: '#999',
    textAlign: 'center',
  },
  footer: {
    padding: 12,
    backgroundColor: '#f1f2f6',
    borderTopWidth: 1,
    borderTopColor: '#ddd',
  },
  footerText: {
    fontSize: 13,
    color: '#666',
    textAlign: 'center',
    fontWeight: '500',
  },

  
  // Estilos para modales
  modalFiltros: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalFiltrosContent: {
    backgroundColor: 'white',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '80%',
  },
  modalFiltrosHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  modalFiltrosHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center'
  },
  modalFiltrosTitulo: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#2C3E50',
  },
  cerrarFiltros: {
    fontSize: 24,
    color: '#999',
  },
  filtrosScroll: {
    padding: 20,
  },
  filtroGrupo: {
    marginBottom: 25,
  },
  filtroTitulo: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.text,
    marginBottom: 12,
  },
  filtroTituloRow: {
    flexDirection: 'row'
  },
  sliderContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  sliderMin: {
    fontSize: 14,
    color: theme.text,
    width: 30,
  },
  sliderTrack: {
    flex: 1,
    height: 6,
    backgroundColor: theme.border,
    color: theme.border,
    borderRadius: 3,
    marginHorizontal: 10,
    overflow: 'hidden',
  },
  sliderFill: {
    height: '100%',
    backgroundColor: theme.primary,
    color: theme.primary
  },
  sliderMax: {
    fontSize: 14,
    color: theme.text,
    width: 30,
    textAlign: 'right',
  },
  sliderButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  sliderBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: theme.inactiveCategory,
    borderRadius: 15,
  },
  sliderBtnActive: {
    backgroundColor: theme.primary,
  },
  sliderBtnText: {
    fontSize: 13,
    color: theme.text,
  },
  sliderBtnTextActive: {
    color: 'white',
    fontWeight: '600',
  },
  dificultadContainer: {
    flexDirection: 'row',
    gap: 10,
  },
  dificultadBtn: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    backgroundColor: theme.primary,
    borderRadius: 10,
  },
  dificultadBtnActive: {
    backgroundColor: theme.inactiveCategory,
  },
  dificultadText: {
    fontSize: 14,
    color: '#fff',
    fontWeight: '600',
  },
  dificultadTextActive: {
    color: theme.inactiveCategoryText,
  },
  filtrosGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  filtroItem: {
    paddingHorizontal: 15,
    paddingVertical: 10,
    backgroundColor: theme.inactiveCategory,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: theme.border,
  },
  filtroItemActive: {
    backgroundColor: theme.primary,
    borderColor: '#fff',
  },
  filtroItemText: {
    fontSize: 14,
    color: theme.text,
  },
  filtroItemTextActive: {
    color: 'white',
    fontWeight: '600',
  },
  contadorFiltros: {
    alignItems: 'center',
    marginVertical: 15,
  },
  contadorTexto: {
    fontSize: 14,
    color: '#666',
    fontWeight: '600',
  },
  modalFiltrosFooter: {
    flexDirection: 'row',
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
    gap: 10,
  },
  botonLimpiar: {
    flex: 1,
    paddingVertical: 14,
    alignItems: 'center',
    backgroundColor: theme.inactiveCategory,
    borderRadius: 10,
  },
  botonLimpiarTexto: {
    fontSize: 16,
    color: theme.inactiveCategoryText,
    fontWeight: '600',
  },
  botonAplicar: {
    flex: 1,
    paddingVertical: 14,
    alignItems: 'center',
    backgroundColor: theme.primary,
    borderRadius: 10,
  },
  botonAplicarTexto: {
    fontSize: 16,
    color: 'white',
    fontWeight: '600',
  },
  // Estilos para modal de detalle (mantener igual)
  modalContainer: {
    flex: 1,
    backgroundColor: 'white',
  },
  modalScroll: {
    flex: 1,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 14,
  },

  headerSide: {
    width: 60,               // ancho fijo
    alignItems: 'center',
    justifyContent: 'center',
  },

  headerCenter: {
    flex: 1,
    alignItems: 'center',
  },
  botonCerrar: {
    position: 'absolute',
    flexDirection: 'row',
    top: Platform.OS === 'web' ? 20 : 50,
    left: 20,
    zIndex: 1,
  },
  botonCerrarTexto: {
    fontSize: 17,
    color: 'white',
    fontWeight: '600',
  },
  modalTitulo: {
    fontSize: 28,
    fontWeight: 'bold',
    color: 'white',
    textAlign: 'center',
    marginTop: 10,
    paddingHorizontal: 40,
  },
    // Estilos para modo oscuro
  headerFila: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 4,
  },
  botonModoOscuro: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 3,
  },
  botonModoOscuroTexto: {
    fontSize: 20,
  },
  favoritoModal: {
    position: 'absolute',
    top: Platform.OS === 'web' ? 20 : 50,
    right: 20,
    zIndex: 1,
  },
  favoritoIconoGrande: {
    fontSize: 28,
  },
  modalContent: {
    padding: 20,
  },
  detalleInfo: {
    backgroundColor: '#f8f9fa',
    borderRadius: 12,
    padding: 16,
    marginBottom: 10,
  },
  detalleInfoItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  detalleInfoLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  detalleInfoLabel: {
    fontSize: 14,
    color: theme.text,
    fontWeight: '500',
  },
  detalleInfoValor: {
    fontSize: 15,
    fontWeight: '600',
    color: theme.text,
  },
  seccionTituloRow:{
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginVertical: 12
  },
  seccionTituloModal: {
    fontSize: 20,
    fontWeight: 'bold',
    color: theme.text,
  },
  descripcion: {
  fontSize: 17, // Aumentado de 16
  color: '#444444', // Gris oscuro
  lineHeight: 26, // Mejor espaciado
  fontWeight: '500',
  padding: 12,
  backgroundColor: theme.card, // Fondo muy suave
  borderRadius: 8,
  borderLeftWidth: 4,
  borderLeftColor: '#4ECDC4',
},
  // PARA INGREDIENTES (itemLista)
itemLista: {
  flexDirection: 'row',
  marginVertical: 12,
  paddingLeft: 10,
  backgroundColor: 'transparent',
},
itemListaIcono: {
  fontSize: 18,
  color: '#4ECDC4', // Color turquesa fijo que funciona en ambos modos
  marginRight: 10,
  paddingVertical: 4,
  fontWeight: 'bold',
},
itemListaTexto: {
  flex: 1,
  fontSize: 16, // Aumentado de 15
  color: '#616161', // Gris más oscuro para modo día
  paddingVertical: 4,
  fontWeight: '500', // Peso medio para mejor legibilidad
},
  // PARA PASOS DE PREPARACIÓN (pasoContainer)
pasoContainer: {
  flexDirection: 'row',
  marginBottom: 16,
  backgroundColor: theme.card,
  borderRadius: 12, // Bordes más redondeados
  padding: 16, // Más padding
  borderWidth: 2, // Borde más grueso
  elevation: 2, // Sombra para modo día
  shadowColor: '#000',
  shadowOffset: { width: 0, height: 1 },
  shadowOpacity: 0.1,
  shadowRadius: 2,
},
pasoNumero: {
  width: 32, // Un poco más grande
  height: 32,
  borderRadius: 16,
  backgroundColor: '#4ECDC4',
  justifyContent: 'center',
  alignItems: 'center',
  marginRight: 16, // Más espacio
  marginTop: 2,
  elevation: 3,
  shadowColor: '#000',
  shadowOffset: { width: 0, height: 2 },
  shadowOpacity: 0.2,
  shadowRadius: 3,
},
pasoNumeroTexto: {
  color: 'white',
  fontWeight: 'bold',
  fontSize: 16, // Más grande
},
pasoTexto: {
  flex: 1,
  fontSize: 16, // Aumentado de 15
  color: '#555555', // Gris más oscuro
  lineHeight: 24, // Mejor espaciado
  fontWeight: '500', // Peso medio
},
  tagsContainerModal: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 20,
  },
  tagModal: {
    backgroundColor: '#4ECDC4',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 15,
  },
  tagTextModal: {
    fontSize: 14,
    color: 'white',
    fontWeight: '600',
  },
    // Estilos para modal de recomendación
  modalRecomendacion: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalRecomendacionContent: {
    backgroundColor: 'white',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '90%',
  },
  modalRecomendacionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  modalRecomendacionHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6
  },
  modalRecomendacionTitulo: {
    fontSize: 22,
    fontWeight: 'bold',
    color: theme.text,
  },
  cerrarRecomendacion: {
    fontSize: 24,
    color: '#999',
  },
  recomendacionScroll: {
    padding: 20,
  },
  recomendacionGrupo: {
    marginBottom: 25,
  },
  recomendacionTitulo: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2C3E50',
  },
  recomendacionItem: {
    marginBottom: 20,
  },
  recomendacionLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2C3E50',
  },
  categoriasRecomendacion: {
    flexDirection: 'row',
  },
  categoriaRecomendacionBtn: {
  paddingHorizontal: 15,
  paddingVertical: 10,
  backgroundColor: '#f0f0f0',
  borderRadius: 20,
  marginRight: 10,
  borderWidth: 2,
  borderColor: 'transparent',
},
categoriaRecomendacionBtnActive: {
  backgroundColor: '#4ECDC4',
  borderColor: '#883d3dff',
  transform: [{ scale: 1.05 }],
},
  categoriaRecomendacionText: {
  fontSize: 14,
  color: '#7f7e7eff',
  fontWeight: '600',
},
categoriaRecomendacionTextActive: {
  color: 'white',
  fontWeight: 'bold',
},
  sliderRecomendacionContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  sliderTrack: {
    flex: 1,
    height: 6,
    backgroundColor: '#e0e0e0',
    borderRadius: 3,
    marginHorizontal: 10,
    overflow: 'hidden',
  },
  sliderFill: {
    height: '100%',
    backgroundColor: '#4ECDC4',
  },
  sliderButtons: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  sliderBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: '#f0f0f0',
    borderRadius: 15,
  },
  sliderBtnActive: {
    backgroundColor: '#4ECDC4',
  },
  sliderBtnText: {
    fontSize: 13,
    color: '#666',
  },
  sliderBtnTextActive: {
    color: 'white',
    fontWeight: '600',
  },
  preferenciasGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  preferenciaBtn: {
  paddingHorizontal: 15,
  paddingVertical: 10,
  backgroundColor: '#f0f0f0',
  borderRadius: 20,
  borderWidth: 2,
  borderColor: 'transparent',
  margin: 4,
},
preferenciaBtnActive: {
  backgroundColor: '#4ECDC4',
  borderColor: '#FFFFFF',
  transform: [{ scale: 1.05 }],
},
  preferenciaText: {
  fontSize: 14,
  color: '#969696ff',
  fontWeight: '600',
},
preferenciaTextActive: {
  color: 'white',
  fontWeight: 'bold',
},
  contadorPreferencias: {
    alignItems: 'center',
    marginVertical: 2,
    padding: 10,
    backgroundColor: theme.card,
    borderRadius: 10,
  },
  contadorTexto: {
    fontSize: 14,
    color: '#666',
    fontWeight: '600',
  },
  recomendacionesGrupo: {
    marginTop: 8,
  },
  recomendacionCard: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    marginBottom: 10,
    elevation: 2,
    borderLeftWidth: 4,
  },
  recomendacionCardHeader: {
    marginBottom: 8,
  },
  recomendacionCardTitulo: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#2C3E50',
    marginBottom: 4,
  },
  recomendacionCardCategoria: {
    fontSize: 14,
    color: '#7F8C8D',
  },
  recomendacionCardInfo: {
    flexDirection: 'row',
    gap: 15,
  },
  recomendacionCardInfoItem: {
    fontSize: 14,
    color: '#7F8C8D',
  },
  modalRecomendacionFooter: {
    flexDirection: 'row',
    padding: 24,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
    gap: 10,
  },
  botonRecomendacionSecundario: {
    flex: 1,
    paddingVertical: 14,
    alignItems: 'center',
    backgroundColor: '#f0f0f0',
    borderRadius: 10,
  },
  botonRecomendacionSecundarioTexto: {
    fontSize: 12,
    color: '#666',
    fontWeight: '600',
  },
  botonRecomendacionAleatorio: {
    flex: 1,
    paddingVertical: 14,
    alignItems: 'center',
    backgroundColor: '#FF9F1A',
    borderRadius: 10,
  },
  botonRecomendacionAleatorioTexto: {
    fontSize: 12,
    color: 'white',
    fontWeight: '600',
  },
  botonRecomendacionPrincipal: {
    flex: 1,
    paddingVertical: 14,
    alignItems: 'center',
    backgroundColor: '#4ECDC4',
    borderRadius: 10,
  },
  botonRecomendacionPrincipalTexto: {
    fontSize: 12,
    color: 'white',
    fontWeight: '600',
  },
  botonRecomendacionVacio: {
    marginTop: 20,
    backgroundColor: '#4ECDC4',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 24,
  },
  botonRecomendacionVacioTexto: {
    color: 'white',
    fontSize: 15,
    fontWeight: '600',
    textAlign: 'center',
  },
  scrollPrincipal: {
  flex: 1,
  width: '100%',
},
scrollContenido: {
  flexGrow: 1,
  paddingBottom: 20, // Espacio al final
},
// ==================== ESTILOS PARA PAGINACIÓN ====================
controlesPaginacion: {
  flexDirection: 'row',
  alignItems: 'center',
  justifyContent: 'center',
  paddingVertical: 4,
  paddingHorizontal: 6,
  marginVertical: 6,
  flexWrap: 'wrap',
},
botonPagina: {
  paddingHorizontal: 6,
  paddingVertical: 3,
  marginHorizontal: 1,
  borderRadius: 4,
},
botonPaginaDeshabilitado: {
  opacity: 0.3,
},
botonPaginaTexto: {
  fontSize: 18,
  color: '#666',
},
botonPaginaTextoDeshabilitado: {
  color: '#999',
},
botonPaginaNumero: {
  width: 30,
  height: 30,
  borderRadius: 15,
  backgroundColor: '#f0f0f0',
  justifyContent: 'center',
  alignItems: 'center',
  marginHorizontal: 4,
},
botonPaginaNumeroActivo: {
  backgroundColor: '#4ECDC4',
},
botonPaginaNumeroTexto: {
  fontSize: 12,
  fontWeight: '600',
  color: '#666',
},
botonPaginaNumeroTextoActivo: {
  color: 'white',
},
puntosSuspensivos: {
  fontSize: 16,
  color: '#666',
  marginHorizontal: 4,
},
selectorPorPagina: {
  flexDirection: 'row',
  alignItems: 'center',
  marginLeft: 10,
  paddingLeft: 10,
  borderLeftWidth: 1,
  borderLeftColor: '#e0e0e0',
},
textoPorPagina: {
  fontSize: 14,
  color: '#666',
  marginRight: 8,
},
botonPorPagina: {
  paddingHorizontal: 8,
  paddingVertical: 4,
  backgroundColor: '#f0f0f0',
  borderRadius: 6,
  marginHorizontal: 2,
},
botonPorPaginaActivo: {
  backgroundColor: '#4ECDC4',
},
botonPorPaginaTexto: {
  fontSize: 14,
  color: '#666',
  fontWeight: '600',
},
botonPorPaginaTextoActivo: {
  color: 'white',
},
// ==================== ESTILOS PARA GRID 3 COLUMNAS ====================
tarjetaRecetaGrid: {
  flex: 1,
  margin: 4,
  padding: 8,
  borderRadius: 10,
  borderWidth: 1,
  borderLeftWidth: 3,
  elevation: 2,
  shadowOffset: { width: 0, height: 1 },
  shadowOpacity: 0.1,
  shadowRadius: 2,
  minHeight: 90,
},
tarjetaGridHeader: {
  flexDirection: 'row',
  justifyContent: 'space-between',
  alignItems: 'flex-start',
  marginBottom: 6,
},
tarjetaGridNombre: {
  fontSize: 12,
  fontWeight: 'bold',
  flex: 1,
  marginRight: 4,
},
favoritoBotonGrid: {
  padding: 2,
},
favoritoIconoGrid: {
  fontSize: 14,
},
tarjetaGridInfo: {
  flexDirection: 'row',
  justifyContent: 'space-between',
  marginBottom: 6,
},
gridInfoItem: {
  flexDirection: 'row',
  alignItems: 'center',
},
gridInfoIcon: {
  fontSize: 10,
  marginRight: 2,
},
gridInfoText: {
  fontSize: 10,
  fontWeight: '600',
},
tagsGridContainer: {
  flexDirection: 'row',
  flexWrap: 'wrap',
  gap: 3,
},
tagGrid: {
  paddingHorizontal: 5,
  paddingVertical: 2,
  borderRadius: 8,
},
tagGridText: {
  fontSize: 9,
  fontWeight: '500',
},
infoPaginacion: {
  flexDirection: 'row',
  justifyContent: 'space-between',
  alignItems: 'center',
  padding: 12,
  backgroundColor: 'white',
  borderRadius: 10,
  marginBottom: 10,
},
infoPaginacionTexto: {
  fontSize: 14,
  color: '#666',
  fontWeight: '500',
},
// ==================== ESTILOS PARA PAGINACIÓN MINI ====================
contadorConBotones: {
  flexDirection: 'row',
  alignItems: 'center',
  justifyContent: 'center',
  gap: 6,
},
botonPaginaMini: {
  width: 28,
  height: 28,
  borderRadius: 14,
  justifyContent: 'center',
  alignItems: 'center',
  backgroundColor: '#f0f0f0', // COLOR FIJO
  borderWidth: 1,
  borderColor: '#ddd', // COLOR FIJO
},
botonPaginaMiniDeshabilitado: {
  opacity: 0.3,
  backgroundColor: theme.inactiveCategory
},
botonPaginaMiniTexto: {
  fontSize: 14,
  color: '#333', // COLOR FIJO
  fontWeight: 'bold',
},
botonPaginaMiniTextoDeshabilitado: {
  color: '#999', // COLOR FIJO
},
numeroRecetaContainer: {
    position: 'absolute',
    bottom: 8,
    right: 8,
    width: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 1,
  },
  numeroRecetaTexto: {
    fontSize: 10,
    fontWeight: 'bold',
    color: '#FFFFFF',
    textShadowColor: 'rgba(0, 0, 0, 0.3)',
    textShadowOffset: { width: 0.5, height: 0.5 },
    textShadowRadius: 1,
  },
});
}