export class DomainError extends Error {
  readonly status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = "DomainError";
    this.status = status;
  }
}

export class DuplicateMeasurementError extends DomainError {
  constructor() {
    super("Já existe uma medição nesta data.", 409);
    this.name = "DuplicateMeasurementError";
  }
}

export class ActiveGoalExistsError extends DomainError {
  constructor() {
    super("Já existe uma meta ativa. Conclua ou abandone a meta atual antes de criar outra.", 409);
    this.name = "ActiveGoalExistsError";
  }
}

export class DuplicateExerciseError extends DomainError {
  constructor() {
    super("Já existe um exercício com este nome.", 409);
    this.name = "DuplicateExerciseError";
  }
}

export class ActiveSessionExistsError extends DomainError {
  constructor() {
    super("Já existe um treino em andamento.", 409);
    this.name = "ActiveSessionExistsError";
  }
}

export class SessionAlreadyFinishedError extends DomainError {
  constructor() {
    super("Este treino já foi finalizado.", 409);
    this.name = "SessionAlreadyFinishedError";
  }
}

export class UnsupportedImageError extends DomainError {
  constructor() {
    super("Formato de imagem não suportado (use JPG, PNG, WEBP ou GIF).", 400);
    this.name = "UnsupportedImageError";
  }
}
