import { useEffect, useState } from 'react';
import { StyleSheet, Text, View, FlatList, SafeAreaView, Button, TextInput } from 'react-native';
import ExpoAudioShareReceiver, { AudioFile } from 'expo-audio-share-receiver';

const DEFAULT_GROUP = 'group.com.example.audioshare'; // Change this to match your App Group

export default function App() {
  const [files, setFiles] = useState<AudioFile[]>([]);
  const [groupName, setGroupName] = useState(DEFAULT_GROUP);

  useEffect(() => {
    // Set the initial app group
    ExpoAudioShareReceiver.setAppGroup(groupName);
    loadFiles();

    const subscription = ExpoAudioShareReceiver.addListener('onNewFiles', (event: { files: string[] }) => {
      console.log('Received new files event:', event);
      if (event && event.files) {
        setFiles(event.files.map(path => ({ path })));
      }
    });

    return () => {
      subscription.remove();
    };
  }, [groupName]);

  const loadFiles = async () => {
    try {
      console.log('Loading files...');
      const loadedFiles = await ExpoAudioShareReceiver.getSharedAudioFiles();
      console.log('Files loaded:', loadedFiles);
      setFiles(loadedFiles);
    } catch (e) {
      console.error('Error loading files:', e);
    }
  };

  const refreshFiles = async () => {
    try {
      console.log('Refreshing files...');
      // refreshFiles triggers onNewFiles event on native side, 
      // but also returns the files directly.
      const refreshedFiles = await ExpoAudioShareReceiver.refreshFiles();
      setFiles(refreshedFiles);
    } catch (e) {
      console.error('Error refreshing files:', e);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.headerContainer}>
        <Text style={styles.header}>Audio Share Receiver</Text>
      </View>

      <View style={styles.inputContainer}>
        <Text style={styles.label}>App Group:</Text>
        <TextInput
          style={styles.input}
          value={groupName}
          onChangeText={setGroupName}
          placeholder="group.com.your.app"
        />
        <Button title="Set Group" onPress={() => ExpoAudioShareReceiver.setAppGroup(groupName)} />
      </View>

      <View style={styles.listContainer}>
        <Text style={styles.subHeader}>Received Files ({files.length})</Text>
        <FlatList
          data={files}
          keyExtractor={(item, index) => index.toString()}
          renderItem={({ item }) => (
            <View style={styles.fileItem}>
              <Text style={styles.filePath} numberOfLines={2}>
                {item.path}
              </Text>
            </View>
          )}
          ListEmptyComponent={<Text style={styles.emptyText}>No files received yet.</Text>}
        />
      </View>

      <View style={styles.buttonContainer}>
        <Button title="Refresh Files" onPress={refreshFiles} />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  headerContainer: {
    padding: 20,
    backgroundColor: '#fff',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  header: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  inputContainer: {
    padding: 15,
    backgroundColor: '#fff',
    marginTop: 10,
  },
  label: {
    fontSize: 14,
    marginBottom: 5,
    color: '#666',
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    padding: 10,
    borderRadius: 5,
    marginBottom: 10,
  },
  listContainer: {
    flex: 1,
    padding: 15,
  },
  subHeader: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 10,
  },
  fileItem: {
    backgroundColor: '#fff',
    padding: 15,
    marginBottom: 10,
    borderRadius: 8,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  filePath: {
    fontSize: 14,
    color: '#333',
  },
  emptyText: {
    textAlign: 'center',
    marginTop: 20,
    color: '#888',
  },
  buttonContainer: {
    padding: 20,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#eee',
  },
});
