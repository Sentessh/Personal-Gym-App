/**
 * Tipos de domínio — modelo lógico da §3 do IMPLEMENTATION_PLAN.md.
 * Estes tipos são o contrato entre a UI e a camada de repositórios;
 * a UI nunca deve manipular documentos crus do Firestore.
 */

export type Modality = 'NORMAL' | 'MUSCLE_ROUND' | 'LOW_VOLUME';

// ── Perfil ──────────────────────────────────────────────────────────
export interface Profile {
  name: string;
  heightCm?: number;
  createdAt: number;
}

export interface BodyWeightEntry {
  id: string;
  weightKg: number;
  date: string; // YYYY-MM-DD
}

// ── Planejamento: Treino ────────────────────────────────────────────
export interface ExerciseCatalogItem {
  id: string;
  name: string;
  defaultMuscleGroup?: string;
}

export interface PlannedExercise {
  exerciseName: string;
  setsCount: number;
  modality: Modality;
  targetReps?: string;
  targetLoad?: number;
  orderIndex: number;
}

export interface WorkoutSection {
  muscleGroup: string;
  orderIndex: number;
  exercises: PlannedExercise[];
}

export interface WorkoutBlock {
  id: string;
  name: string; // "Treino A", "Treino B"...
  orderIndex: number;
  sections: WorkoutSection[];
}

export interface WorkoutPlan {
  id: string;
  name: string;
  notes?: string;
  createdAt: number;
  updatedAt: number;
  blocks: WorkoutBlock[];
}

// ── Planejamento: Dieta ─────────────────────────────────────────────
export interface Food {
  id: string;
  name: string;
  kcalPer100g: number;
  carbsPer100g: number;
  proteinPer100g: number;
  fatPer100g: number;
  source: 'taco' | 'custom';
}

export interface MealItem {
  foodId: string;
  foodNameSnapshot: string;
  quantityGrams: number;
}

export interface Meal {
  id: string;
  name: string;
  time?: string; // HH:MM
  orderIndex: number;
  items: MealItem[];
}

export interface DietPlan {
  id: string;
  name: string;
  createdAt: number;
  updatedAt: number;
  meals: Meal[];
}

// ── Seleção ativa (regra de negócio central) ────────────────────────
export interface ActiveSelection {
  activeWorkoutPlanId: string | null;
  activeDietPlanId: string | null;
  updatedAt: number;
}

// ── Execução / Histórico ────────────────────────────────────────────
export interface MealCheck {
  mealId: string;
  mealNameSnapshot: string;
  plannedKcalSnapshot: number;
  checked: boolean;
  checkedAt: number | null;
}

export interface DailyLog {
  date: string; // id do documento = YYYY-MM-DD
  isRestDay: boolean;
  notes?: string;
  dietPlanId: string | null;
  mealChecks: MealCheck[];
}

export interface WorkoutSessionLog {
  id: string;
  workoutBlockId: string | null;
  blockNameSnapshot: string;
  startedAt: number;
  finishedAt: number | null;
}

export interface SetLog {
  id: string;
  exerciseNameSnapshot: string;
  modalitySnapshot: Modality;
  setNumber: number;
  weightUsed: number | null;
  repsDone: number | null;
  completed: boolean;
  completedAt: number | null;
}
