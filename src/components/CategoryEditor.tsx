import React, { useEffect, useState } from 'react';
import { Alert, Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { addCategory, deleteCategory, renameCategory } from '../db/database';
import type { Category } from '../types';
import { palette, space } from '../theme';
import { Button, Field } from './UI';

export function CategoryEditor({ visible, category, onClose, onSaved, onDeleted }: { visible: boolean; category?: Category; onClose: () => void; onSaved: () => void; onDeleted?: () => void }) {
  const [name, setName] = useState(''); const [busy, setBusy] = useState(false);
  useEffect(() => { if (visible) setName(category?.name ?? ''); }, [visible, category]);
  const save = async () => {
    if (!name.trim()) { Alert.alert('Add a name', 'Category names cannot be empty.'); return; }
    setBusy(true);
    try { if (category) await renameCategory(category.id, name); else await addCategory(name); onSaved(); onClose(); }
    catch (error) { Alert.alert('Could not save category', error instanceof Error ? error.message : 'Try again.'); }
    finally { setBusy(false); }
  };
  const remove = () => Alert.alert('Delete category?', 'Its tasks will stay in your notebook and move to Inbox.', [{ text: 'Cancel', style: 'cancel' }, { text: 'Delete', style: 'destructive', onPress: async () => { if (!category) return; await deleteCategory(category.id); onSaved(); onDeleted?.(); onClose(); } }]);
  return <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}><View style={styles.container}><View style={styles.topbar}><Text style={styles.title}>{category ? 'Edit category' : 'New category'}</Text><Pressable onPress={onClose} hitSlop={10} accessibilityLabel="Close"><Ionicons name="close" size={24} color={palette.ink}/></Pressable></View><ScrollView contentContainerStyle={styles.body}><Field label="Category name" value={name} onChangeText={setName} placeholder="e.g. Reading list" maxLength={60} autoFocus/><Button label={busy?'Saving…':category?'Save changes':'Add category'} onPress={save}/>{category?.id && !category.seeded ? <Button label="Delete category" onPress={remove} secondary/>:null}</ScrollView></View></Modal>;
}
const styles=StyleSheet.create({container:{flex:1,backgroundColor:palette.paper},topbar:{paddingHorizontal:space.md,paddingVertical:16,borderBottomWidth:1,borderColor:palette.line,flexDirection:'row',justifyContent:'space-between',alignItems:'center'},title:{fontSize:20,fontWeight:'700',color:palette.ink},body:{padding:space.md},});
