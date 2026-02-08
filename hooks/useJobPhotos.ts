"use client";

import { useState, useCallback } from "react";
import { supabase } from "@/src/lib/supabaseClient";
import type { JobPhoto, JobPhotoInsert, AddJobPhotoForm } from "@/src/types/phaseB";

interface UseJobPhotosState {
  photos: JobPhoto[];
  isLoading: boolean;
  isUploading: boolean;
  error: string | null;
}

interface UseJobPhotosReturn extends UseJobPhotosState {
  fetchPhotos: (jobSessionId: string) => Promise<void>;
  uploadPhoto: (data: AddJobPhotoForm, file: File) => Promise<{ success: boolean; error?: string; data?: JobPhoto }>;
  addPhotoUrl: (data: AddJobPhotoForm) => Promise<{ success: boolean; error?: string; data?: JobPhoto }>;
  deletePhoto: (id: string) => Promise<{ success: boolean; error?: string }>;
  getPhotosByType: (jobSessionId: string, photoType: string) => JobPhoto[];
}

/**
 * Hook for managing job photos with upload functionality
 */
export function useJobPhotos(): UseJobPhotosReturn {
  const [state, setState] = useState<UseJobPhotosState>({
    photos: [],
    isLoading: false,
    isUploading: false,
    error: null,
  });

  // Fetch photos for a job session
  const fetchPhotos = useCallback(async (jobSessionId: string) => {
    try {
      setState((prev) => ({ ...prev, isLoading: true, error: null }));

      const { data, error } = await supabase
        .from("job_photos")
        .select("*")
        .eq("job_session_id", jobSessionId)
        .order("captured_at", { ascending: true });

      if (error) throw error;

      setState({
        photos: data || [],
        isLoading: false,
        isUploading: false,
        error: null,
      });
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : "Failed to fetch photos";
      console.error("Error fetching job photos:", err);
      setState((prev) => ({
        ...prev,
        isLoading: false,
        error: errorMessage,
      }));
    }
  }, []);

  // Upload photo to storage and create record
  const uploadPhoto = useCallback(
    async (
      data: AddJobPhotoForm,
      file: File
    ): Promise<{ success: boolean; error?: string; data?: JobPhoto }> => {
      try {
        setState((prev) => ({ ...prev, isUploading: true, error: null }));

        // Generate unique filename
        const fileExt = file.name.split(".").pop();
        const fileName = `${data.jobSessionId}/${data.photoType}_${Date.now()}.${fileExt}`;

        // Upload to Supabase Storage
        const { error: uploadError } = await supabase.storage
          .from("job-photos")
          .upload(fileName, file, {
            cacheControl: "3600",
            upsert: false,
          });

        if (uploadError) throw uploadError;

        // Get public URL
        const { data: urlData } = supabase.storage
          .from("job-photos")
          .getPublicUrl(fileName);

        const photoUrl = urlData.publicUrl;

        // Create photo record
        const photoData: JobPhotoInsert = {
          job_session_id: data.jobSessionId,
          photo_url: photoUrl,
          photo_type: data.photoType,
          caption: data.caption,
          latitude: data.latitude,
          longitude: data.longitude,
          captured_at: new Date().toISOString(),
        };

        const { data: newPhoto, error: insertError } = await supabase
          .from("job_photos")
          .insert(photoData)
          .select()
          .single();

        if (insertError) throw insertError;

        setState((prev) => ({
          ...prev,
          photos: [...prev.photos, newPhoto],
          isUploading: false,
        }));

        return { success: true, data: newPhoto };
      } catch (err: unknown) {
        const errorMessage = err instanceof Error ? err.message : "Failed to upload photo";
        console.error("Error uploading photo:", err);
        setState((prev) => ({
          ...prev,
          isUploading: false,
          error: errorMessage,
        }));
        return { success: false, error: errorMessage };
      }
    },
    []
  );

  // Add photo by URL (if already uploaded elsewhere)
  const addPhotoUrl = useCallback(
    async (data: AddJobPhotoForm): Promise<{ success: boolean; error?: string; data?: JobPhoto }> => {
      try {
        const photoData: JobPhotoInsert = {
          job_session_id: data.jobSessionId,
          photo_url: data.photoUrl,
          photo_type: data.photoType,
          caption: data.caption,
          latitude: data.latitude,
          longitude: data.longitude,
          captured_at: new Date().toISOString(),
        };

        const { data: newPhoto, error } = await supabase
          .from("job_photos")
          .insert(photoData)
          .select()
          .single();

        if (error) throw error;

        setState((prev) => ({
          ...prev,
          photos: [...prev.photos, newPhoto],
        }));

        return { success: true, data: newPhoto };
      } catch (err: unknown) {
        const errorMessage = err instanceof Error ? err.message : "Failed to add photo";
        console.error("Error adding photo:", err);
        return { success: false, error: errorMessage };
      }
    },
    []
  );

  // Delete photo
  const deletePhoto = useCallback(
    async (id: string): Promise<{ success: boolean; error?: string }> => {
      try {
        // Get photo to find storage path
        const photo = state.photos.find((p) => p.id === id);

        const { error } = await supabase.from("job_photos").delete().eq("id", id);

        if (error) throw error;

        // Try to delete from storage (best effort)
        if (photo?.photo_url) {
          try {
            const urlParts = photo.photo_url.split("/job-photos/");
            if (urlParts[1]) {
              await supabase.storage.from("job-photos").remove([urlParts[1]]);
            }
          } catch {
            // Ignore storage deletion errors
          }
        }

        setState((prev) => ({
          ...prev,
          photos: prev.photos.filter((p) => p.id !== id),
        }));

        return { success: true };
      } catch (err: unknown) {
        const errorMessage = err instanceof Error ? err.message : "Failed to delete photo";
        console.error("Error deleting photo:", err);
        return { success: false, error: errorMessage };
      }
    },
    [state.photos]
  );

  // Get photos by type
  const getPhotosByType = useCallback(
    (jobSessionId: string, photoType: string): JobPhoto[] => {
      return state.photos.filter(
        (p) => p.job_session_id === jobSessionId && p.photo_type === photoType
      );
    },
    [state.photos]
  );

  return {
    ...state,
    fetchPhotos,
    uploadPhoto,
    addPhotoUrl,
    deletePhoto,
    getPhotosByType,
  };
}
