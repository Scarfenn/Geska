import {Modal, View, Text, TextInput, TouchableOpacity, TouchableWithoutFeedback} from "react-native";

import createStyles from "@/styles/styles";

export default function AddSubtaskModal({visible, themeName, mode, modalTaskId, subtaskText, setSubtaskText, addSubtask, closeModal}){
    const styles = createStyles(themeName, mode)
    
    return(
        <Modal visible={visible} animationType="fade" transparent={true}>
              <TouchableWithoutFeedback onPress={closeModal}>
                <View style={styles.modalOverlay}>
                  <TouchableWithoutFeedback>
                    <View style={styles.modalBox}>
                      <Text style={styles.modalTitle}>Nueva subtarea</Text>
                      <TextInput
                        style={styles.input}
                        placeholder="Escribe una subtarea..."
                        placeholderTextColor={mode==='light'? "#888":"#ccc"}
                        value={subtaskText}
                        onChangeText={setSubtaskText}
                      />
                      <TouchableOpacity 
                        style={styles.saveButton} 
                        onPress={() => {
                          addSubtask(modalTaskId, subtaskText);
                          setSubtaskText("");
                          closeModal();
                        }}
                      >
                        <Text style={styles.saveButtonText}>Agregar</Text>
                      </TouchableOpacity>
                      <TouchableOpacity style={{marginTop:10}} onPress={closeModal}>
                        <Text style={{textAlign:'center', color:'red'}}>Cancelar</Text>
                      </TouchableOpacity>
                    </View>
                  </TouchableWithoutFeedback>
                </View>
              </TouchableWithoutFeedback>
            </Modal>
            )
        }
