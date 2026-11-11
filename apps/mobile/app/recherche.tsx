import {
  MAX_PROJECT_PHOTOS,
  PROJECT_TEXT_MAX_LENGTH,
  SUGGESTION_MIN_LENGTH,
  appendDescription,
  appendIdea,
  detectUrgency,
  matchNeedPhrases,
  needHelpLevel,
  remainingCompletion,
  resolveUrgency,
  type NeedIdea,
  type NeedPhrase,
  type UrgencyChoice,
} from "@menao/core";
import { router, useLocalSearchParams } from "expo-router";
import {
  ArrowRight,
  BadgeCheck,
  Camera,
  Check,
  Clock,
  Info,
  Plus,
  Search,
  ShieldCheck,
  Siren,
  Sparkles,
  TriangleAlert,
} from "lucide-react-native";
import { useEffect, useMemo, useRef, useState } from "react";
import { Pressable, StyleSheet, Text, TextInput, View, type TextInputInstance } from "react-native";
import { AnalysisScreen } from "@/components/analysis-screen";
import { DictationButton } from "@/components/dictation-button";
import { PhotoThumbnails } from "@/components/photo-thumbnails";
import { ActionSubmit } from "@/components/pro/action-kit";
import { FicheScreen, FicheTag, type FicheTone } from "@/components/pro/fiche-kit";
import { IconSquare } from "@/components/pro/tools-kit";
import { PillRow } from "@/components/request-kit";
import { TradeShortcuts } from "@/components/trade-shortcuts";
import { fr } from "@/i18n/fr";
import { AiProgress } from "@/components/ai-progress";
import { choosePhotoSource, pickPhotos, uploadPhoto, type PickedPhoto } from "@/lib/photos";
import { useNeedSuggestions } from "@/lib/need-suggestions";
import { haptic } from "@/lib/haptics";
import { describeProjectPhoto } from "@/lib/photo-description";
import { analyzeNeed } from "@/lib/project";
import { useTrades } from "@/lib/trades";
import { uploadBatch } from "@/lib/uploads";
import { Notice } from "@/ui";
import { theme } from "@/ui/theme";

const { colors, font, radius, spacing } = theme;
const s = fr.search.suggestions;
const u = fr.search.understanding;
const ph = fr.search.photoDescription;
const ur = fr.search.urgency;

type PhotoDraft =
  | { step: "reading" }
  | { step: "filled" }
  | { step: "ready"; description: string }
  | { step: "failed" };
const p = fr.search.proposals;
// Icônes des cartes d'avantages, dans l'ordre des textes (comme sur le site).
const FEATURE_ICONS = [Sparkles, Clock, ShieldCheck, BadgeCheck];

/** Délai compris qui annonce une urgence : pastille orange, comme la maquette. */
const URGENT = /urgen/i;

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

/**
 * Saisie du projet (F-05) d'après la maquette « Recherche », comme sur le site : zone de saisie
 * avec photos (10 au plus) et micro (dictée), aide progressive, raccourcis métiers et avantages.
 * Écran « Nette » (lot 12, maquette « SaisieApp ») : grand titre, grande carte de saisie en
 * 18 points, « Compris : » en pastilles dans la carte, boutons ronds photo et dictée en bas de la
 * carte, « Précisez : » en pastilles contour et « Trouver mon artisan » collé en bas. L'analyse par l'IA crée le projet et pré-remplit ses critères (ADR 0012) ; l'écran
 * animé reste affiché pendant l'analyse puis l'envoi des photos, avant la vérification des critères.
 * « Redemander un devis » (`artisan`, `depuis`, `nom`) : la demande ne part qu'à l'artisan d'un
 * chantier précédent (ADR 0198) ; le nom ne sert qu'au bandeau, le serveur vérifie le chantier commun.
 */
export default function Recherche() {
  const params = useLocalSearchParams<{
    metier?: string;
    artisan?: string;
    depuis?: string;
    nom?: string;
  }>();
  const rehire =
    params.artisan && params.depuis && UUID.test(params.artisan) && UUID.test(params.depuis)
      ? { artisanId: params.artisan, chantierId: params.depuis }
      : null;
  const trades = useTrades();
  const [description, setDescription] = useState("");
  const [trade, setTrade] = useState<string | null>(params.metier ?? null);
  const [photos, setPhotos] = useState<PickedPhoto[]>([]);
  const [phase, setPhase] = useState<"idle" | "analyzing" | "photos">("idle");
  const [failure, setFailure] = useState<string | null>(null);
  const [focused, setFocused] = useState(false);
  const ready = description.trim().length > 0;
  const input = useRef<TextInputInstance>(null);
  // Suggestions pendant la saisie (ADR 0177), comme sur le site : la suite proposée, à toucher pour
  // l'ajouter, et des idées en pastilles pour préciser la demande.
  const suggestion = useNeedSuggestions(description, phase === "idle");
  const [usedIdeas, setUsedIdeas] = useState<string[]>([]);
  // Propositions instantanées (ADR 0178), comme sur le site : demandes types dès les premiers mots.
  const proposals = useMemo(
    () => (phase === "idle" ? matchNeedPhrases(description) : []),
    [phase, description],
  );
  const [closedFor, setClosedFor] = useState<string | null>(null);
  const showProposals = proposals.length > 0 && closedFor !== description;
  const completion =
    suggestion && !showProposals
      ? remainingCompletion(suggestion.base, suggestion.completion, description)
      : null;
  const ideas =
    suggestion && description.trim().length >= SUGGESTION_MIN_LENGTH
      ? suggestion.ideas.filter((idea) => !usedIdeas.includes(`${suggestion.base}|${idea.label}`))
      : [];

  /** Texte modifié par une suggestion, puis curseur placé (fin du texte ou endroit à compléter). */
  function replaceText(next: string, select: [number, number] | null = null) {
    const value = next.slice(0, PROJECT_TEXT_MAX_LENGTH);
    setDescription(value);
    const [start, end] = select ?? [value.length, value.length];
    input.current?.focus();
    setTimeout(() => {
      // Natif : setSelection ; version web : le champ est un élément HTML.
      const field = input.current as
        (TextInputInstance & { setSelectionRange?: (start: number, end: number) => void }) | null;
      if (typeof field?.setSelection === "function") field.setSelection(start, end);
      else field?.setSelectionRange?.(start, end);
    }, 50);
  }

  function chooseProposal(proposal: NeedPhrase) {
    const next = `${proposal.text} `;
    setClosedFor(next);
    replaceText(next);
  }

  // Compréhension en direct (ADR 0179), comme sur le site.
  const [answered, setAnswered] = useState<string[]>([]);
  const understood =
    suggestion && description.trim().length >= SUGGESTION_MIN_LENGTH ? suggestion.understood : null;
  // Pastilles de la maquette : métier en bleu clair, délai urgent en orange, le reste en gris.
  const understoodItems = understood
    ? [
        {
          tone: "primary" as FicheTone,
          label: understood.trade
            ? (trades.find((t) => t.code === understood.trade)?.label ?? null)
            : null,
        },
        { tone: "neutral" as FicheTone, label: understood.room },
        { tone: "neutral" as FicheTone, label: understood.city },
        { tone: "neutral" as FicheTone, label: understood.surface },
        {
          tone: (understood.timing && URGENT.test(understood.timing)
            ? "warning"
            : "neutral") as FicheTone,
          label: understood.timing,
        },
      ].filter((item): item is { tone: FicheTone; label: string } => Boolean(item.label))
    : [];
  const question =
    understood && suggestion?.question && !answered.includes(`${suggestion.base}|q`)
      ? suggestion.question
      : null;

  function answerQuestion(answer: NeedIdea) {
    if (suggestion) setAnswered((done) => [...done, `${suggestion.base}|q`]);
    const next = appendIdea(description, answer.insert);
    replaceText(next.text, next.select);
  }

  function addIdea(idea: NeedIdea) {
    if (suggestion) setUsedIdeas((used) => [...used, `${suggestion.base}|${idea.label}`]);
    const next = appendIdea(description, idea.insert);
    replaceText(next.text, next.select);
  }

  // Photo → description (ADR 0180), comme sur le site : tant que la description est courte, la
  // première photo jointe est décrite ; le texte vide est rempli, sinon la description est proposée.
  const [photoDraft, setPhotoDraft] = useState<PhotoDraft | null>(null);
  const currentText = useRef(description);
  useEffect(() => {
    currentText.current = description;
  }, [description]);

  async function describePhoto(photo: PickedPhoto) {
    setPhotoDraft({ step: "reading" });
    const drafted = await describeProjectPhoto(photo);
    if (!drafted) return setPhotoDraft({ step: "failed" });
    if (currentText.current.trim()) return setPhotoDraft({ step: "ready", description: drafted });
    setPhotoDraft({ step: "filled" });
    replaceText(`${drafted} `);
  }

  async function addPhotos() {
    const source = await choosePhotoSource(fr.search.photos.add);
    if (!source) return;
    const picked = await pickPhotos(source, MAX_PROJECT_PHOTOS - photos.length);
    if ("error" in picked) return setFailure(picked.error);
    setFailure(null);
    setPhotos((current) => [...current, ...picked.photos].slice(0, MAX_PROJECT_PHOTOS));
    const first = picked.photos[0];
    if (first && needHelpLevel(description) !== "suffisant" && photoDraft?.step !== "reading") {
      void describePhoto(first);
    }
  }

  async function submit() {
    if (!ready || phase !== "idle") return;
    setFailure(null);
    setPhase("analyzing");
    const result = await analyzeNeed(
      description.trim(),
      trade,
      rehire,
      urgencyChoice === "auto" ? null : urgencyChoice,
    );
    if (result.status !== "ok") {
      setPhase("idle");
      return setFailure(fr.search.errors[result.status]);
    }
    let failed = false;
    if (photos.length) {
      // Comme sur le site : les photos rejoignent le projet créé par l'analyse.
      setPhase("photos");
      const project = { purpose: "project_photo", projectId: result.projectId } as const;
      const sent = await uploadBatch(photos, (photo) => uploadPhoto(project, photo));
      failed = sent.added < photos.length;
    }
    router.replace({
      pathname: "/projet/[id]",
      params: failed ? { id: result.projectId, photos: "erreur" } : { id: result.projectId },
    });
  }

  // Urgence (ADR 0279), comme sur le site : repérée dans le texte dès la saisie, ou réglée avec le
  // bouton « Urgent » ; le choix du particulier passe avant ce qui est repéré.
  const [urgencyChoice, setUrgencyChoice] = useState<UrgencyChoice>("auto");
  const detectedUrgency = useMemo(() => detectUrgency(description), [description]);
  const urgent = resolveUrgency(urgencyChoice, detectedUrgency !== null);
  const urgencyDetected = urgent && urgencyChoice === "auto" ? detectedUrgency : null;
  // Le bouton s'allume tout seul : un léger retour au toucher, une fois par motif repéré.
  const lastReason = useRef<string | null>(null);
  useEffect(() => {
    const reason = urgencyDetected?.reason ?? null;
    if (reason && reason !== lastReason.current) haptic.select();
    lastReason.current = reason;
  }, [urgencyDetected?.reason]);

  function toggleUrgency() {
    haptic.select();
    // Retirée : « non » seulement s'il y a quelque chose à contredire dans le texte.
    setUrgencyChoice(urgent ? (detectedUrgency ? "non" : "auto") : "oui");
  }

  const help = needHelpLevel(description);
  return (
    <View style={styles.page}>
      <FicheScreen
        footer={
          <ActionSubmit label={fr.search.submit} icon={Search} disabled={!ready} onPress={submit} />
        }
      >
        <View style={styles.hero}>
          <Text role="heading" aria-level={1} style={styles.title}>
            {fr.search.titleStart} <Text style={styles.accent}>{fr.search.titleAccent}</Text>
          </Text>
          <View style={styles.tagline}>
            <Sparkles size={15} color={colors["primary-strong"]} />
            <Text style={styles.taglineText}>{fr.search.tagline}</Text>
          </View>
        </View>
        {rehire && params.nom ? <Notice tone="info">{fr.search.rehire(params.nom)}</Notice> : null}
        {failure && <Notice tone="error">{failure}</Notice>}
        <View style={[styles.box, focused && styles.boxFocused, urgent && styles.boxUrgent]}>
          {photos.length > 0 ? (
            <View aria-label={fr.search.photos.count(photos.length)}>
              <PhotoThumbnails
                // La même photo peut être choisie deux fois : repérée par sa place dans la liste.
                photos={photos.map((photo, i) => ({ key: String(i), uri: photo.uri }))}
                alt={fr.search.photos.alt}
                removeLabel={fr.search.photos.remove}
                onRemove={(key) =>
                  setPhotos((current) => current.filter((_, i) => String(i) !== key))
                }
              />
            </View>
          ) : null}
          <TextInput
            ref={input}
            aria-label={fr.search.label}
            value={description}
            onChangeText={setDescription}
            placeholder={fr.search.placeholder}
            placeholderTextColor={colors["subtle-foreground"]}
            maxLength={PROJECT_TEXT_MAX_LENGTH}
            multiline
            autoFocus
            onFocus={() => setFocused(true)}
            onBlur={() => setFocused(false)}
            style={styles.input}
          />
          {understoodItems.length > 0 ? (
            <View aria-live="polite" style={styles.understood}>
              <Text style={styles.understoodLabel}>{u.title}</Text>
              {understoodItems.map(({ tone, label }) => (
                <FicheTag key={label} text={label} tone={tone} />
              ))}
            </View>
          ) : null}
          <View style={styles.boxActions}>
            <Pressable
              role="button"
              aria-label={fr.search.attach}
              accessibilityHint={fr.search.photos.hint}
              disabled={photos.length >= MAX_PROJECT_PHOTOS}
              onPress={addPhotos}
              style={({ pressed }) => [
                styles.round,
                photos.length >= MAX_PROJECT_PHOTOS && styles.disabled,
                pressed && styles.roundPressed,
              ]}
            >
              <Camera size={20} color={colors.foreground} />
            </Pressable>
            <Pressable
              role="button"
              aria-pressed={urgent}
              accessibilityHint={ur.buttonHint}
              onPress={toggleUrgency}
              style={({ pressed }) => [
                styles.urgent,
                urgent && styles.urgentOn,
                pressed && styles.pressed,
              ]}
            >
              <Siren size={18} color={urgent ? colors.danger : colors.foreground} />
              <Text style={[styles.urgentText, urgent && styles.urgentTextOn]}>{ur.button}</Text>
              {urgent ? <Check size={15} strokeWidth={3} color={colors.danger} /> : null}
            </Pressable>
            <View style={styles.spacer} />
            <DictationButton
              onText={(spoken) =>
                setDescription((current) =>
                  (current.trim() ? `${current.trim()} ${spoken}` : spoken).slice(
                    0,
                    PROJECT_TEXT_MAX_LENGTH,
                  ),
                )
              }
              onError={setFailure}
            />
          </View>
        </View>
        {urgencyDetected ? (
          <View aria-live="polite" style={styles.urgencyCard}>
            <View style={styles.urgencyIcon}>
              <Siren size={18} color={colors.danger} />
            </View>
            <View style={styles.urgencyText}>
              <Text style={styles.urgencyTitle}>
                {ur.detectedTitle(ur.reasons[urgencyDetected.reason])}
              </Text>
              <Text style={styles.urgencyBody}>{ur.detectedBody}</Text>
              <Pressable
                role="button"
                hitSlop={10}
                onPress={() => {
                  haptic.select();
                  setUrgencyChoice("non");
                }}
                style={({ pressed }) => [styles.notUrgent, pressed && styles.pressed]}
              >
                <Text style={styles.notUrgentText}>{ur.notUrgent}</Text>
              </Pressable>
            </View>
          </View>
        ) : null}
        {urgent ? (
          <View style={styles.danger}>
            <TriangleAlert size={15} color={colors["muted-foreground"]} />
            <Text style={styles.dangerText}>{ur.danger}</Text>
          </View>
        ) : null}
        {showProposals ? (
          <View role="list" aria-label={p.label} style={styles.proposals}>
            {proposals.map((proposal, index) => (
              <Pressable
                key={proposal.text}
                role="button"
                onPress={() => chooseProposal(proposal)}
                style={({ pressed }) => [
                  styles.proposal,
                  index > 0 && styles.proposalBorder,
                  pressed && styles.proposalPressed,
                ]}
              >
                <Search size={15} color={colors["muted-foreground"]} />
                <Text style={styles.proposalText}>{proposal.text}</Text>
              </Pressable>
            ))}
          </View>
        ) : null}
        {completion ? (
          <Pressable
            role="button"
            aria-label={s.acceptAria(completion.trim())}
            onPress={() => replaceText(description + completion)}
            style={({ pressed }) => [styles.completion, pressed && styles.pressed]}
          >
            <Text style={styles.completionText} numberOfLines={2}>
              <Text style={styles.completionEllipsis}>… </Text>
              {completion.trim()}
            </Text>
            <View style={styles.completionAction}>
              <ArrowRight size={14} color={colors["primary-strong"]} />
              <Text style={styles.completionActionText}>{s.accept}</Text>
            </View>
          </Pressable>
        ) : null}
        {photoDraft?.step === "ready" ? (
          <View aria-live="polite" style={styles.card}>
            <View style={styles.cardTitle}>
              <Sparkles size={14} color={colors["primary-strong"]} />
              <Text style={styles.cardTitleText}>{ph.fromPhoto}</Text>
            </View>
            <Text style={styles.cardText}>{photoDraft.description}</Text>
            <Pressable
              role="button"
              onPress={() => {
                setPhotoDraft(null);
                replaceText(`${appendDescription(description, photoDraft.description)} `);
              }}
              style={({ pressed }) => [styles.idea, styles.photoAdd, pressed && styles.pressed]}
            >
              <Plus size={15} color={colors.foreground} />
              <Text style={styles.ideaText}>{ph.add}</Text>
            </Pressable>
          </View>
        ) : photoDraft?.step === "reading" ? (
          <AiProgress steps={fr.aiProgress.photo} />
        ) : photoDraft ? (
          <View aria-live="polite" style={styles.help}>
            <Sparkles
              size={14}
              color={
                photoDraft.step === "failed" ? colors["muted-foreground"] : colors["primary-strong"]
              }
            />
            <Text style={[styles.helpText, photoDraft.step !== "failed" && styles.helpEnough]}>
              {ph[photoDraft.step]}
            </Text>
          </View>
        ) : null}
        {question ? (
          <View role="group" aria-label={question.label} style={styles.card}>
            <Text style={styles.cardText}>{question.label}</Text>
            <PillRow>
              {question.answers.map((answer) => (
                <Pressable
                  key={answer.label}
                  role="button"
                  onPress={() => answerQuestion(answer)}
                  style={({ pressed }) => [styles.idea, pressed && styles.ideaPressed]}
                >
                  <Text style={styles.ideaText}>{answer.label}</Text>
                </Pressable>
              ))}
            </PillRow>
          </View>
        ) : null}
        {ideas.length > 0 ? (
          <View role="group" aria-label={s.ideasAria} style={styles.ideas}>
            <Text style={styles.ideasLabel}>{s.ideas}</Text>
            <PillRow>
              {ideas.map((idea) => (
                <Pressable
                  key={idea.label}
                  role="button"
                  aria-label={s.addIdea(idea.label)}
                  onPress={() => addIdea(idea)}
                  style={({ pressed }) => [styles.idea, pressed && styles.ideaPressed]}
                >
                  <Text style={styles.ideaText}>{idea.label}</Text>
                </Pressable>
              ))}
            </PillRow>
          </View>
        ) : null}
        <View aria-live="polite" style={styles.help}>
          {help === "suffisant" ? (
            <>
              <Sparkles size={14} color={colors["primary-strong"]} />
              <Text style={[styles.helpText, styles.helpEnough]}>{fr.search.helpEnough}</Text>
            </>
          ) : (
            <>
              <Info size={14} color={colors["muted-foreground"]} />
              <Text style={styles.helpText}>
                {help === "vide" ? fr.search.helpEmpty : fr.search.helpShort}
              </Text>
            </>
          )}
        </View>
        {trades.length > 0 && (
          <TradeShortcuts
            trades={trades}
            selected={trade}
            onToggle={(code) => setTrade((current) => (current === code ? null : code))}
          />
        )}
        <Text style={styles.privacy}>{fr.search.privacy}</Text>
        <View style={styles.features}>
          {fr.search.features.map((feature, i) => {
            const Icon = FEATURE_ICONS[i] ?? Sparkles;
            return (
              <View key={feature.title} style={styles.feature}>
                <IconSquare icon={Icon} tone="primary" size={40} />
                <View style={styles.featureText}>
                  <Text style={styles.featureTitle}>{feature.title}</Text>
                  <Text style={styles.featureBody}>{feature.body}</Text>
                </View>
              </View>
            );
          })}
        </View>
      </FicheScreen>
      {phase !== "idle" && (
        <AnalysisScreen
          photos={phase === "photos"}
          understood={{
            trade: trades.find((t) => t.code === (trade ?? understood?.trade))?.label ?? null,
            city: understood?.city ?? null,
            timing: understood?.timing ?? null,
          }}
          urgent={urgent}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1 },
  hero: { gap: spacing(2) },
  title: {
    fontFamily: font.display,
    fontSize: 32,
    lineHeight: 34,
    letterSpacing: -0.96,
    color: colors.foreground,
  },
  accent: { color: colors.primary },
  tagline: { flexDirection: "row", alignItems: "center", gap: spacing(1.5) },
  taglineText: { fontFamily: font.medium, fontSize: 14, color: colors["primary-strong"] },
  box: {
    gap: spacing(3),
    padding: spacing(4),
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  boxFocused: { borderColor: colors.primary },
  boxUrgent: { borderColor: colors.danger },
  // Texte en 18 points (pas de zoom sur iPhone, au-delà de 16).
  input: {
    minHeight: 110,
    padding: 0,
    // La carte porte déjà le contour bleu de saisie (version web : pas de second contour).
    outlineWidth: 0,
    fontFamily: font.regular,
    fontSize: 18,
    lineHeight: 26,
    color: colors.foreground,
    textAlignVertical: "top",
  },
  understood: { flexDirection: "row", flexWrap: "wrap", alignItems: "center", gap: 6 },
  understoodLabel: { fontFamily: font.bold, fontSize: 12, color: colors["muted-foreground"] },
  boxActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing(2),
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  round: {
    width: 44,
    height: 44,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    alignItems: "center",
    justifyContent: "center",
  },
  roundPressed: { backgroundColor: colors["primary-soft"] },
  // Bouton « Urgent » de la maquette : contour gris au repos, rouge clair une fois allumé.
  urgent: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing(2),
    height: 44,
    paddingHorizontal: spacing(4),
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors["border-strong"],
    backgroundColor: colors.surface,
  },
  urgentOn: { borderColor: colors.danger, backgroundColor: colors["danger-soft"] },
  urgentText: { fontFamily: font.semibold, fontSize: 15, color: colors.foreground },
  urgentTextOn: { fontFamily: font.bold, color: colors.danger },
  spacer: { flex: 1 },
  urgencyCard: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: spacing(3),
    padding: spacing(3.5),
    borderRadius: 16,
    backgroundColor: colors["danger-soft"],
  },
  urgencyIcon: {
    width: 36,
    height: 36,
    borderRadius: 11,
    backgroundColor: colors.surface,
    alignItems: "center",
    justifyContent: "center",
  },
  urgencyText: { flex: 1, gap: 3 },
  urgencyTitle: { fontFamily: font.bold, fontSize: 15, lineHeight: 20, color: colors.danger },
  urgencyBody: { fontFamily: font.regular, fontSize: 14, lineHeight: 20, color: colors.label },
  notUrgent: { alignSelf: "flex-start", paddingVertical: spacing(1.5) },
  notUrgentText: {
    fontFamily: font.semibold,
    fontSize: 14,
    color: colors.foreground,
    textDecorationLine: "underline",
  },
  danger: { flexDirection: "row", alignItems: "flex-start", gap: spacing(2) },
  dangerText: {
    flex: 1,
    fontFamily: font.regular,
    fontSize: 13,
    lineHeight: 18,
    color: colors["muted-foreground"],
  },
  disabled: { opacity: 0.5 },
  pressed: { opacity: 0.8 },
  proposals: {
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    overflow: "hidden",
  },
  proposal: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing(3),
    paddingHorizontal: spacing(4),
    paddingVertical: spacing(3),
  },
  proposalBorder: { borderTopWidth: 1, borderTopColor: colors.border },
  proposalPressed: { backgroundColor: colors["primary-softer"] },
  proposalText: {
    flex: 1,
    fontFamily: font.regular,
    fontSize: 15,
    lineHeight: 21,
    color: colors.foreground,
  },
  completion: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing(3),
    borderRadius: 16,
    backgroundColor: colors["primary-soft"],
    paddingHorizontal: spacing(4),
    paddingVertical: spacing(3),
  },
  completionText: {
    flex: 1,
    fontFamily: font.regular,
    fontSize: 14,
    lineHeight: 20,
    color: colors.label,
  },
  completionEllipsis: { color: colors["muted-foreground"] },
  completionAction: { flexDirection: "row", alignItems: "center", gap: spacing(1) },
  completionActionText: {
    fontFamily: font.semibold,
    fontSize: 13,
    color: colors["primary-strong"],
  },
  card: {
    gap: spacing(3),
    padding: spacing(4),
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  cardTitle: { flexDirection: "row", alignItems: "center", gap: spacing(1.5) },
  cardTitleText: { fontFamily: font.bold, fontSize: 13, color: colors["primary-strong"] },
  cardText: {
    fontFamily: font.semibold,
    fontSize: 15,
    lineHeight: 21,
    color: colors.foreground,
  },
  photoAdd: { alignSelf: "flex-start" },
  ideas: { gap: spacing(2) },
  ideasLabel: { fontFamily: font.bold, fontSize: 13, color: colors["muted-foreground"] },
  // Pastilles contour de la maquette (« Précisez : »).
  idea: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing(1.5),
    minHeight: 40,
    maxWidth: "100%",
    paddingHorizontal: 14,
    paddingVertical: spacing(1.5),
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors["border-strong"],
    backgroundColor: colors.surface,
  },
  ideaPressed: { backgroundColor: colors["primary-softer"] },
  ideaText: { flexShrink: 1, fontFamily: font.semibold, fontSize: 14, color: colors.foreground },
  help: { flexDirection: "row", alignItems: "flex-start", gap: spacing(1.5) },
  helpText: {
    flex: 1,
    fontFamily: font.regular,
    fontSize: 13,
    lineHeight: 18,
    color: colors["muted-foreground"],
  },
  helpEnough: { color: colors["primary-strong"] },
  privacy: {
    fontFamily: font.regular,
    fontSize: 12,
    lineHeight: 17,
    color: colors["muted-foreground"],
  },
  features: { gap: spacing(2.5) },
  feature: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: spacing(3),
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    padding: spacing(4),
  },
  featureText: { flex: 1, gap: 2 },
  featureTitle: { fontFamily: font.semibold, fontSize: 15, color: colors.foreground },
  featureBody: {
    fontFamily: font.regular,
    fontSize: 13,
    lineHeight: 19,
    color: colors["muted-foreground"],
  },
});
