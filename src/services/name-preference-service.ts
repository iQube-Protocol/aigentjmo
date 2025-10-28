import { supabase } from "@/integrations/supabase/client";

export interface NamePreference {
  id: string;
  user_id: string;
  persona_type: 'knyt' | 'qripto';
  name_source: 'invitation' | 'linkedin' | 'custom';
  preferred_first_name?: string | null;
  preferred_last_name?: string | null;
  linkedin_first_name?: string | null;
  linkedin_last_name?: string | null;
  twitter_username?: string | null;
  created_at: string;
  updated_at: string;
}

export interface NameConflictData {
  personaType: 'knyt' | 'qripto';
  invitationName?: { firstName?: string; lastName?: string };
  linkedinName?: { firstName?: string; lastName?: string };
  currentName?: { firstName?: string; lastName?: string };
}

export class NamePreferenceService {
  static async getNamePreference(userId: string, personaType: 'knyt' | 'qripto'): Promise<NamePreference | null> {
    if (!userId) {
      console.warn('⚠️ No user ID provided');
      return null;
    }

    const { data, error } = await supabase
      .from('user_name_preferences')
      .select('*')
      .eq('user_id', userId)
      .eq('persona_type', personaType)
      .maybeSingle();

    if (error) {
      console.error('Error fetching name preference:', error);
      return null;
    }

    if (!data) return null;

    // Cast to expected types
    return {
      ...data,
      name_source: data.name_source as 'custom' | 'invitation' | 'linkedin',
      persona_type: data.persona_type as 'knyt' | 'qripto'
    };
  }

  static async saveNamePreference(preference: Partial<NamePreference>): Promise<{ success: boolean; error?: string }> {
    const user = (await supabase.auth.getUser()).data.user;
    if (!user) return { success: false, error: 'User not authenticated' };
    if (!preference.persona_type) return { success: false, error: 'Persona type required' };

    try {
      // First check if preference exists for this persona
      const existingPref = await this.getNamePreference(user.id, preference.persona_type);
      
      if (existingPref) {
        // Update existing preference for this persona
        const { error } = await supabase
          .from('user_name_preferences')
          .update({
            name_source: preference.name_source,
            preferred_first_name: preference.preferred_first_name || null,
            preferred_last_name: preference.preferred_last_name || null,
            linkedin_first_name: preference.linkedin_first_name || null,
            linkedin_last_name: preference.linkedin_last_name || null,
            twitter_username: preference.twitter_username || null,
          })
          .eq('user_id', user.id)
          .eq('persona_type', preference.persona_type);

        if (error) {
          console.error('Error updating name preference:', error);
          return { success: false, error: error.message };
        }
      } else {
        // Create new preference for this persona
        const { error } = await supabase
          .from('user_name_preferences')
          .insert({
            user_id: user.id,
            persona_type: preference.persona_type,
            name_source: preference.name_source || 'custom',
            preferred_first_name: preference.preferred_first_name || null,
            preferred_last_name: preference.preferred_last_name || null,
            linkedin_first_name: preference.linkedin_first_name || null,
            linkedin_last_name: preference.linkedin_last_name || null,
            twitter_username: preference.twitter_username || null,
          });

        if (error) {
          console.error('Error creating name preference:', error);
          return { success: false, error: error.message };
        }
      }

      console.log('✅ Successfully saved name preference');
      return { success: true };
    } catch (error: any) {
      console.error('Error saving name preference:', error);
      return { success: false, error: error.message };
    }
  }

  static async detectNameConflict(
    personaType: 'knyt' | 'qripto' | 'blak',
    linkedinData: { firstName?: string; lastName?: string },
    invitationData?: { firstName?: string; lastName?: string },
    currentData?: { firstName?: string; lastName?: string }
  ): Promise<NameConflictData | null> {
    // For KNYT personas, check if LinkedIn data conflicts with invitation data
    if (personaType === 'knyt' && invitationData) {
      const hasConflict = 
        (linkedinData.firstName && invitationData.firstName && linkedinData.firstName !== invitationData.firstName) ||
        (linkedinData.lastName && invitationData.lastName && linkedinData.lastName !== invitationData.lastName);

      if (hasConflict) {
        return {
          personaType,
          invitationName: invitationData,
          linkedinName: linkedinData,
          currentName: currentData,
        };
      }
    }

    // For Qrypto personas, only show conflict if user wants to override LinkedIn with custom/invitation
    if (personaType === 'qripto' && linkedinData) {
      // Always provide the option to change, but default to LinkedIn
      return {
        personaType,
        invitationName: invitationData,
        linkedinName: linkedinData,
        currentName: currentData,
      };
    }

    return null;
  }

  static async getInvitationData(email: string): Promise<{ firstName?: string; lastName?: string } | null> {
    const { data, error } = await supabase
      .from('invited_users')
      .select('persona_data')
      .eq('email', email)
      .eq('signup_completed', true)
      .maybeSingle();

    if (error || !data) {
      return null;
    }

    return {
      firstName: data.persona_data?.['First-Name'],
      lastName: data.persona_data?.['Last-Name'],
    };
  }

  /**
   * Get the effective first name based on name preference
   */
  static getEffectiveName(preference: NamePreference): string {
    switch (preference.name_source) {
      case 'custom':
        return preference.preferred_first_name || '';
      case 'linkedin':
        return preference.linkedin_first_name || '';
      default:
        return preference.preferred_first_name || '';
    }
  }

  static async processLinkedInNames(userId: string, firstName: string, lastName: string): Promise<void> {
    console.log('🏷️ Processing LinkedIn names for user:', userId);
    console.log('📝 LinkedIn names:', { firstName, lastName });
    
    try {
      // Add timeout protection
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('LinkedIn name processing timeout')), 5000)
      );

      const processingPromise = this.doProcessLinkedInNames(userId, firstName, lastName);
      
      await Promise.race([processingPromise, timeoutPromise]);
      
    } catch (error) {
      console.error('❌ Error processing LinkedIn names:', error);
      // Don't throw - this is now called asynchronously and shouldn't block OAuth
    }
  }

  private static async doProcessLinkedInNames(userId: string, firstName: string, lastName: string): Promise<void> {
    console.log('🏷️ Processing LinkedIn names for user:', userId);
    
    // Check which personas exist for this user
    const [knytResult, qryptoResult] = await Promise.all([
      supabase.from('knyt_personas').select('id').eq('user_id', userId).maybeSingle(),
      supabase.from('qripto_personas').select('id').eq('user_id', userId).maybeSingle()
    ]);

    // Process each persona type separately
    if (knytResult.data) {
      await this.processLinkedInForPersona(userId, 'knyt', firstName, lastName);
    }
    
    if (qryptoResult.data) {
      await this.processLinkedInForPersona(userId, 'qripto', firstName, lastName);
    }
  }

  private static async processLinkedInForPersona(
    userId: string, 
    personaType: 'knyt' | 'qripto', 
    firstName: string, 
    lastName: string
  ): Promise<void> {
    console.log(`🏷️ Processing LinkedIn names for ${personaType} persona`);
    
    // Get existing name preference for this specific persona
    let namePrefs = await this.getNamePreference(userId, personaType);
    
    if (!namePrefs) {
      console.log(`💡 Creating new name preferences for ${personaType}`);
      
      // For KNYT: default to custom source
      // For Qrypto: default to LinkedIn source, apply automatically
      const defaultSource = personaType === 'knyt' ? 'custom' : 'linkedin';
      
      namePrefs = await this.createNamePreferences(userId, personaType, {
        linkedin_first_name: firstName,
        linkedin_last_name: lastName,
        name_source: defaultSource
      });
      
      if (namePrefs) {
        console.log(`✅ Created name preferences with source: ${defaultSource}`);
        // Only update persona names for Qrypto (which defaults to linkedin)
        if (personaType === 'qripto') {
          await this.updatePersonaNames(userId, namePrefs);
        }
      }
      return;
    }
    
    console.log(`📋 Current name preferences:`, namePrefs);
    
    // Update LinkedIn fields in existing preference
    const updatedPrefs = {
      ...namePrefs,
      linkedin_first_name: firstName,
      linkedin_last_name: lastName
    };
    
    // For KNYT: preserve existing source, DO NOT update persona names automatically
    // For Qrypto: switch to LinkedIn source and update names
    if (personaType === 'qripto' && namePrefs.name_source !== 'custom') {
      updatedPrefs.name_source = 'linkedin';
      console.log(`💡 ${personaType}: Switching to LinkedIn as name source`);
      
      // Update preferences in database
      await this.updateNamePreferences(userId, personaType, updatedPrefs);
      
      // Update persona names for Qrypto
      await this.updatePersonaNames(userId, updatedPrefs);
      console.log(`✅ Updated ${personaType} persona names`);
    } else if (personaType === 'knyt') {
      // Keep existing source for KNYT - only store LinkedIn data, don't apply it
      console.log(`🛡️ ${personaType}: Preserving existing name source: ${namePrefs.name_source}, storing LinkedIn data`);
      
      // Update preferences in database (but don't update persona names)
      await this.updateNamePreferences(userId, personaType, updatedPrefs);
      console.log(`✅ Stored LinkedIn data for ${personaType} but preserved existing names`);
    }
  }

  static async getNamePreferences(userId: string, personaType: 'knyt' | 'qripto'): Promise<NamePreference | null> {
    const { data, error } = await supabase
      .from('user_name_preferences')
      .select('*')
      .eq('user_id', userId)
      .eq('persona_type', personaType)
      .maybeSingle();

    if (error) {
      console.error('Error fetching name preferences:', error);
      return null;
    }

    return data as NamePreference | null;
  }

  static async createNamePreferences(userId: string, personaType: 'knyt' | 'qripto', preferences: Partial<NamePreference>): Promise<NamePreference | null> {
    const { data, error} = await supabase
      .from('user_name_preferences')
      .insert({
        user_id: userId,
        persona_type: personaType,
        name_source: preferences.name_source || 'custom',
        preferred_first_name: preferences.preferred_first_name || null,
        preferred_last_name: preferences.preferred_last_name || null,
        linkedin_first_name: preferences.linkedin_first_name || null,
        linkedin_last_name: preferences.linkedin_last_name || null,
        twitter_username: preferences.twitter_username || null,
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating name preferences:', error);
      return null;
    }

    if (!data) return null;

    // Cast to expected types
    return {
      ...data,
      name_source: data.name_source as 'custom' | 'invitation' | 'linkedin',
      persona_type: data.persona_type as 'knyt' | 'qripto'
    };
  }

  static async updateNamePreferences(userId: string, personaType: 'knyt' | 'qripto', preferences: Partial<NamePreference>): Promise<void> {
    const updateData = {
      user_id: userId,
      persona_type: personaType,
      name_source: preferences.name_source || 'custom',
      preferred_first_name: preferences.preferred_first_name,
      preferred_last_name: preferences.preferred_last_name,
      linkedin_first_name: preferences.linkedin_first_name,
      linkedin_last_name: preferences.linkedin_last_name,
      twitter_username: preferences.twitter_username,
    };

    const { error } = await supabase
      .from('user_name_preferences')
      .upsert(updateData, { onConflict: 'user_id,persona_type' });

    if (error) {
      console.error('Error updating name preferences:', error);
      throw error;
    }
  }

  static async updatePersonaNames(userId: string, preferences: NamePreference): Promise<void> {
    const firstName = this.getEffectiveName(preferences);
    const lastName = preferences.name_source === 'custom' ? preferences.preferred_last_name :
                    preferences.name_source === 'linkedin' ? preferences.linkedin_last_name :
                    null;

    // Update both persona tables with the display name
    const displayName = `${firstName || ''} ${lastName || ''}`.trim();
    
    // Update knyt_personas
    const { error: knytError } = await supabase
      .from('knyt_personas')
      .update({ display_name: displayName })
      .eq('user_id', userId);
    
    if (knytError) {
      console.error('Error updating knyt persona names:', knytError);
    }
    
    // Update qripto_personas
    const { error: qriptoError } = await supabase
      .from('qripto_personas')
      .update({ display_name: displayName })
      .eq('user_id', userId);

    if (qriptoError) {
      console.error('Error updating qripto persona names:', qriptoError);
    }
    
    console.log(`✅ Updated persona names: ${firstName} ${lastName}`);
  }
}