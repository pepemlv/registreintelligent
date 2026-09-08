import { useRef, type ReactNode } from 'react';
import {
  X, Minus, Upload, ScanLine, Sparkles, Check, FileText, Loader2, Camera, FileScan,
  ArrowDownLeft, ArrowUpRight, ClipboardList, Circle, Plus,
} from 'lucide-react';
import { getCategoryMeta } from '@/lib/categories';
import FolderPicker from './FolderPicker';
import {
  INSTRUCTION_OPTIONS, DISPATCH_MODE_OPTIONS, INCOMING_STATUS_OPTIONS, OUTGOING_STATUS_OPTIONS,
  type UploadFlow, type UploadSource,
} from '@/hooks/useUploadFlow';

interface UploadModalProps {
  flow: UploadFlow;
}

const SOURCE_META: { id: UploadSource; icon: typeof Upload; label: string; desc: string }[] = [
  { id: 'upload', icon: Upload, label: 'Importer', desc: 'Choisir un fichier' },
  { id: 'camera', icon: Camera, label: 'Appareil photo', desc: 'Prendre une photo' },
  { id: 'scanner', icon: FileScan, label: 'Scanner', desc: 'Numériser un document' },
];

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="p-3 rounded-xl bg-gray-50 border border-gray-100">
      <label className="text-[10px] text-gray-400 font-medium uppercase mb-1 block">{label}</label>
      {children}
    </div>
  );
}

const inputCls = 'w-full bg-transparent text-sm font-semibold text-gray-900 outline-none placeholder:font-normal placeholder:text-gray-300';
const selectCls = `${inputCls} cursor-pointer`;
const textareaCls = 'w-full bg-transparent text-sm text-gray-800 outline-none resize-none placeholder:text-gray-300';

function aiEngineLabel(engine?: string | null): string {
  if (engine === 'claude') return 'Claude';
  if (engine === 'openai') return 'OpenAI';
  if (engine === 'local' || engine === 'ollama') return 'IA locale';
  return 'IA';
}

export default function UploadModal({ flow }: UploadModalProps) {
  const {
    activeJob: job, isDraft, draftDirection, setDraftDirection, dragOver, setDragOver, folders,
    startNewScan, startProcessing, updateEdited, updateRegister, setReceivedDate, setSelectedFolderId,
    handleFolderCreated, handleSave, retryJob, dismissJob, close,
  } = flow;

  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] ?? null;
    if (file) startProcessing(file, 'upload');
  };

  const handleCameraCapture = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] ?? null;
    if (file) startProcessing(file, 'camera');
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files?.[0] ?? null;
    if (file) startProcessing(file, 'upload');
  };

  const sourceLabel = job?.activeSource === 'camera' ? 'Photo prise' : job?.activeSource === 'scanner' ? 'Document numérisé' : 'Fichier sélectionné';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm" onClick={close}>
      <div
        className="bg-white rounded-3xl shadow-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between p-6 border-b border-gray-100">
          <h2 className="text-lg font-bold text-gray-900">Scanner ou importer un document</h2>
          <div className="flex items-center gap-1.5">
            {!isDraft && (
              <button
                onClick={startNewScan}
                title="Scanner un autre document — celui-ci continue en arrière-plan"
                className="flex items-center gap-1.5 px-2.5 h-8 rounded-lg hover:bg-gray-100 text-gray-600 text-xs font-semibold transition-colors"
              >
                <Plus className="w-4 h-4" />
                <span className="hidden sm:inline">Autre document</span>
              </button>
            )}
            <button onClick={close} title="Réduire — le document continue en arrière-plan" className="w-8 h-8 rounded-lg hover:bg-gray-100 flex items-center justify-center transition-colors">
              <Minus className="w-5 h-5 text-gray-500" />
            </button>
          </div>
        </div>

        <div className="p-6">
          {/* Draft: pick direction + source */}
          {isDraft && (
            <div>
              <div className="mb-4">
                <div className="text-xs text-gray-400 font-medium uppercase mb-2">Sens du courrier</div>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setDraftDirection('incoming')}
                    className={`flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-xl text-sm font-semibold border-2 transition-all ${
                      draftDirection === 'incoming'
                        ? 'bg-usps-blue text-white border-usps-blue shadow-sm'
                        : 'bg-white text-gray-600 border-gray-200 hover:border-usps-blue/40'
                    }`}
                  >
                    <ArrowDownLeft className="w-4 h-4" />
                    Courrier entrant
                  </button>
                  <button
                    type="button"
                    onClick={() => setDraftDirection('outgoing')}
                    className={`flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-xl text-sm font-semibold border-2 transition-all ${
                      draftDirection === 'outgoing'
                        ? 'bg-usps-blue text-white border-usps-blue shadow-sm'
                        : 'bg-white text-gray-600 border-gray-200 hover:border-usps-blue/40'
                    }`}
                  >
                    <ArrowUpRight className="w-4 h-4" />
                    Courrier sortant
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3 mb-4">
                {SOURCE_META.map((src) => (
                  <button
                    key={src.id}
                    onClick={() => {
                      if (src.id === 'upload') fileInputRef.current?.click();
                      else if (src.id === 'camera') cameraInputRef.current?.click();
                      else startProcessing(null, 'scanner');
                    }}
                    className="flex flex-col items-center gap-2 p-4 rounded-xl border-2 border-gray-100 hover:border-usps-blue hover:bg-usps-gray transition-all text-center"
                  >
                    <div className="w-11 h-11 rounded-xl bg-usps-blue flex items-center justify-center">
                      <src.icon className="w-5 h-5 text-white" />
                    </div>
                    <div className="text-sm font-semibold text-gray-900">{src.label}</div>
                    <div className="text-[11px] text-gray-400">{src.desc}</div>
                  </button>
                ))}
              </div>

              <input
                ref={fileInputRef}
                type="file"
                accept="image/*,.pdf,.heic"
                onChange={handleFileSelect}
                className="hidden"
              />
              <input
                ref={cameraInputRef}
                type="file"
                accept="image/*"
                capture="environment"
                onChange={handleCameraCapture}
                className="hidden"
              />

              <div
                onClick={() => fileInputRef.current?.click()}
                onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
                onDragLeave={() => setDragOver(false)}
                onDrop={handleDrop}
                className={`border-2 border-dashed rounded-2xl p-8 text-center cursor-pointer transition-all ${
                  dragOver ? 'border-usps-blue bg-usps-gray' : 'border-gray-200 hover:border-usps-blue hover:bg-usps-gray/50'
                }`}
              >
                <div className="w-14 h-14 rounded-2xl bg-usps-blue flex items-center justify-center mx-auto mb-3">
                  {dragOver ? <Upload className="w-7 h-7 text-white" /> : <ScanLine className="w-7 h-7 text-white" />}
                </div>
                <p className="font-semibold text-gray-900 mb-1">Ou déposez un fichier ici</p>
                <p className="text-xs text-gray-400">JPG, PNG, PDF ou WEBP - l'IA le lira et le classera automatiquement</p>
              </div>

              <div className="mt-4 p-4 rounded-xl bg-usps-gray border border-usps-blue/20">
                <div className="flex items-start gap-2.5">
                  <Sparkles className="w-5 h-5 text-usps-blue flex-shrink-0 mt-0.5" />
                  <div className="text-sm text-usps-blue">
                    <div className="font-medium mb-1">Traitement par l'IA</div>
                    <p>Une fois le fichier importé, photographié ou numérisé, notre IA locale lit le document, identifie son type, extrait les informations clés comme les montants et les échéances, et l'organise automatiquement. Vous pourrez ensuite compléter la fiche registre (entrant ou sortant). Vous pouvez lancer plusieurs documents à la suite : chacun continue son analyse en arrière-plan.</p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {job?.stage === 'error' && (
            <div className="py-10 text-center">
              <div className="w-14 h-14 rounded-2xl bg-red-50 flex items-center justify-center mx-auto mb-4">
                <X className="w-7 h-7 text-usps-red" />
              </div>
              <h3 className="font-semibold text-gray-900 mb-2">Échec de l'extraction</h3>
              <p className="text-sm text-gray-500 mb-5">{job.error}</p>
              <div className="flex gap-3 justify-center">
                <button
                  onClick={() => { dismissJob(job.id); close(); }}
                  className="px-4 py-2.5 bg-gray-100 text-gray-700 rounded-xl text-sm font-medium hover:bg-gray-200 transition-colors"
                >
                  Annuler
                </button>
                <button
                  onClick={retryJob}
                  className="px-4 py-2.5 bg-usps-blue text-white rounded-xl text-sm font-semibold hover:bg-usps-blue-dark transition-colors"
                >
                  Essayer un autre fichier
                </button>
              </div>
            </div>
          )}

          {/* Processing Stage */}
          {job?.stage === 'processing' && (
            <div className="py-12 text-center">
              <div className="relative w-20 h-20 mx-auto mb-6">
                <div className="absolute inset-0 rounded-full border-4 border-gray-100" />
                <div className="absolute inset-0 rounded-full border-4 border-usps-blue border-t-transparent animate-spin" />
                <div className="absolute inset-0 flex items-center justify-center">
                  <ScanLine className="w-8 h-8 text-usps-blue" />
                </div>
              </div>
              <h3 className="font-semibold text-gray-900 mb-2">L'IA analyse votre document...</h3>
              {job.selectedFile && (
                <p className="text-xs text-gray-400 mb-4">{sourceLabel} : {job.selectedFile.name}</p>
              )}
              {job.activeSource === 'scanner' && (
                <p className="text-xs text-gray-400 mb-4">Numérisation du document...</p>
              )}
              <div className="space-y-2 text-sm max-w-xs mx-auto">
                {job.steps.map((step) => (
                  <div key={step.id} className="flex items-center gap-2 justify-center">
                    {step.status === 'done' && <Check className="w-4 h-4 text-emerald-600 shrink-0" />}
                    {step.status === 'active' && <Loader2 className="w-4 h-4 animate-spin text-usps-blue shrink-0" />}
                    {step.status === 'pending' && <Circle className="w-4 h-4 text-gray-300 shrink-0" />}
                    <span className={
                      step.status === 'done' ? 'text-emerald-700 font-medium' : step.status === 'active' ? 'text-gray-700' : 'text-gray-400'
                    }>
                      {step.label}
                    </span>
                  </div>
                ))}
              </div>
              <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
                <button
                  onClick={() => { dismissJob(job.id); close(); }}
                  className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold text-gray-600 bg-gray-100 hover:bg-gray-200 transition-colors"
                >
                  Annuler
                </button>
                <button
                  onClick={startNewScan}
                  className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold text-usps-blue bg-usps-gray hover:bg-blue-100 transition-colors"
                >
                  <Plus className="w-3.5 h-3.5" />
                  Scanner un autre document en attendant
                </button>
              </div>
            </div>
          )}

          {/* Result Stage */}
          {job?.stage === 'result' && job.edited && (
            <div>
              <div className="flex items-center gap-3 mb-5 p-4 rounded-xl bg-emerald-50 border border-emerald-100">
                <div className="w-10 h-10 rounded-full bg-emerald-600 flex items-center justify-center">
                  <Check className="w-5 h-5 text-white" />
                </div>
                <div>
                  <div className="font-semibold text-emerald-900">Document analysé !</div>
                  <div className="text-sm text-emerald-700">Complétez la fiche registre ci-dessous, puis enregistrez.</div>
                  <div className="mt-1 inline-flex items-center gap-1.5 rounded-full bg-white/70 px-2 py-0.5 text-[11px] font-semibold text-emerald-800">
                    <Sparkles className="w-3 h-3" />
                    Traité par {aiEngineLabel(job.edited.processed_by)}
                  </div>
                </div>
              </div>

              <div className="space-y-3">
                <Field label="Objet">
                  <input
                    type="text"
                    value={job.edited.title}
                    onChange={(e) => updateEdited({ title: e.target.value })}
                    className={inputCls}
                  />
                </Field>

                <div className="flex items-center justify-between p-3 rounded-xl bg-gray-50 border border-gray-100">
                  <div className="text-[10px] text-gray-400 font-medium uppercase">Sens du courrier</div>
                  <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold ${
                    job.direction === 'outgoing' ? 'bg-violet-50 text-violet-700' : 'bg-usps-gray text-usps-blue'
                  }`}>
                    {job.direction === 'outgoing' ? <ArrowUpRight className="w-3.5 h-3.5" /> : <ArrowDownLeft className="w-3.5 h-3.5" />}
                    {job.direction === 'outgoing' ? 'Sortant' : 'Entrant'}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <Field label="Catégorie">
                    <div className="text-sm font-semibold text-gray-900">{getCategoryMeta(job.edited.category).label}</div>
                  </Field>
                  <Field label="Type de document">
                    <input
                      type="text"
                      value={job.edited.document_type}
                      onChange={(e) => updateEdited({ document_type: e.target.value })}
                      className={inputCls}
                    />
                  </Field>
                </div>

                <div className="flex items-center justify-between p-4 rounded-xl bg-gray-50 border border-gray-100">
                  <div className="text-xs text-gray-400 font-medium uppercase">Enregistrer dans un dossier</div>
                  <FolderPicker
                    folders={folders}
                    selectedFolderId={job.selectedFolderId}
                    onSelect={setSelectedFolderId}
                    onFolderCreated={handleFolderCreated}
                    align="right"
                  />
                </div>

                <div className="p-4 rounded-xl bg-usps-gray border border-usps-blue/20">
                  <div className="flex items-center gap-2 mb-2">
                    <Sparkles className="w-4 h-4 text-usps-blue" />
                    <div className="text-xs text-usps-blue font-medium uppercase">Résumé IA</div>
                    <div className="ml-auto text-[10px] font-semibold text-usps-blue bg-white/70 rounded-full px-2 py-0.5">
                      {aiEngineLabel(job.edited.processed_by)}
                    </div>
                  </div>
                  <p className="text-sm text-gray-700">{job.edited.summary}</p>
                </div>

                {/* Register form */}
                <div className="pt-2">
                  <div className="flex items-center gap-2 mb-2">
                    <ClipboardList className="w-4 h-4 text-usps-blue" />
                    <span className="text-sm font-bold text-gray-900">
                      Registre du courrier {job.direction === 'incoming' ? 'arrivée' : 'départ'}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <Field label={job.direction === 'incoming' ? "N° d'enregistrement" : "N° d'ordre / numéro de sortie"}>
                      <input
                        type="text"
                        value={job.register.registrationNumber}
                        onChange={(e) => updateRegister({ registrationNumber: e.target.value })}
                        className={inputCls}
                      />
                    </Field>
                    <Field label={job.direction === 'incoming' ? 'Date de réception' : "Date d'expédition"}>
                      <input
                        type="date"
                        value={job.receivedDate}
                        onChange={(e) => setReceivedDate(e.target.value)}
                        className={inputCls}
                      />
                    </Field>

                    <Field label={job.direction === 'incoming' ? 'N° / Référence du courrier' : 'Référence du courrier'}>
                      <input
                        type="text"
                        value={job.register.referenceNumber}
                        onChange={(e) => updateRegister({ referenceNumber: e.target.value })}
                        placeholder="Réf. de l'expéditeur"
                        className={inputCls}
                      />
                    </Field>

                    {job.direction === 'incoming' ? (
                      <Field label="Date du courrier">
                        <input
                          type="date"
                          value={job.register.documentDate ?? ''}
                          onChange={(e) => updateRegister({ documentDate: e.target.value || null })}
                          className={inputCls}
                        />
                      </Field>
                    ) : (
                      <Field label="Destinataire">
                        <input
                          type="text"
                          value={job.register.recipient}
                          onChange={(e) => updateRegister({ recipient: e.target.value })}
                          className={inputCls}
                        />
                      </Field>
                    )}

                    {job.direction === 'incoming' && (
                      <>
                        <Field label="Expéditeur / Provenance">
                          <input
                            type="text"
                            value={job.edited.sender}
                            onChange={(e) => updateEdited({ sender: e.target.value })}
                            className={inputCls}
                          />
                        </Field>
                        <Field label="Destinataire">
                          <input
                            type="text"
                            value={job.register.recipient}
                            onChange={(e) => updateRegister({ recipient: e.target.value })}
                            placeholder="Service ou responsable"
                            className={inputCls}
                          />
                        </Field>
                      </>
                    )}

                    {job.direction === 'outgoing' && (
                      <Field label="Adresse / institution destinataire">
                        <input
                          type="text"
                          value={job.register.recipientAddress}
                          onChange={(e) => updateRegister({ recipientAddress: e.target.value })}
                          className={inputCls}
                        />
                      </Field>
                    )}

                    <Field label={job.direction === 'incoming' ? "Service d'affectation" : 'Service émetteur'}>
                      <input
                        type="text"
                        value={job.register.assignedService}
                        onChange={(e) => updateRegister({ assignedService: e.target.value })}
                        className={inputCls}
                      />
                    </Field>

                    {job.direction === 'incoming' && (
                      <Field label="Instruction / Imputation">
                        <select
                          value={job.register.instruction}
                          onChange={(e) => updateRegister({ instruction: e.target.value })}
                          className={selectCls}
                        >
                          {INSTRUCTION_OPTIONS.map((opt) => (
                            <option key={opt} value={opt}>{opt}</option>
                          ))}
                        </select>
                      </Field>
                    )}

                    {job.direction === 'incoming' && (
                      <Field label="Date de transmission">
                        <input
                          type="date"
                          value={job.register.transmissionDate ?? ''}
                          onChange={(e) => updateRegister({ transmissionDate: e.target.value || null })}
                          className={inputCls}
                        />
                      </Field>
                    )}

                    {job.direction === 'incoming' && (
                      <Field label="Réception par le service (nom)">
                        <input
                          type="text"
                          value={job.register.receivedByService}
                          onChange={(e) => updateRegister({ receivedByService: e.target.value })}
                          className={inputCls}
                        />
                      </Field>
                    )}

                    {job.direction === 'incoming' && (
                      <Field label="Échéance">
                        <input
                          type="date"
                          value={job.edited.due_date ?? ''}
                          onChange={(e) => updateEdited({ due_date: e.target.value || null })}
                          className={inputCls}
                        />
                      </Field>
                    )}

                    {job.direction === 'outgoing' && (
                      <Field label="Mode d'expédition">
                        <select
                          value={job.register.dispatchMode}
                          onChange={(e) => updateRegister({ dispatchMode: e.target.value })}
                          className={selectCls}
                        >
                          {DISPATCH_MODE_OPTIONS.map((opt) => (
                            <option key={opt} value={opt}>{opt}</option>
                          ))}
                        </select>
                      </Field>
                    )}

                    {job.direction === 'outgoing' && (
                      <Field label="Preuve d'envoi / accusé de réception">
                        <input
                          type="text"
                          value={job.register.proofOfSending}
                          onChange={(e) => updateRegister({ proofOfSending: e.target.value })}
                          placeholder="Référence, n° de suivi..."
                          className={inputCls}
                        />
                      </Field>
                    )}

                    {job.direction === 'outgoing' && (
                      <Field label="Date de réception par le destinataire">
                        <input
                          type="date"
                          value={job.register.recipientReceivedDate ?? ''}
                          onChange={(e) => updateRegister({ recipientReceivedDate: e.target.value || null })}
                          className={inputCls}
                        />
                      </Field>
                    )}

                    <Field label="Statut">
                      <select
                        value={job.register.registerStatus}
                        onChange={(e) => updateRegister({ registerStatus: e.target.value })}
                        className={selectCls}
                      >
                        {(job.direction === 'incoming' ? INCOMING_STATUS_OPTIONS : OUTGOING_STATUS_OPTIONS).map((opt) => (
                          <option key={opt} value={opt}>{opt}</option>
                        ))}
                      </select>
                    </Field>

                    <Field label="Montant dû (optionnel)">
                      <input
                        type="number"
                        step="0.01"
                        value={job.edited.amount_due ?? ''}
                        onChange={(e) => updateEdited({ amount_due: e.target.value === '' ? null : Number(e.target.value) })}
                        placeholder="0.00"
                        className={inputCls}
                      />
                    </Field>
                  </div>

                  <div className="mt-3">
                    <Field label="Observations">
                      <textarea
                        value={job.register.observations}
                        onChange={(e) => updateRegister({ observations: e.target.value })}
                        rows={2}
                        placeholder="Informations complémentaires..."
                        className={textareaCls}
                      />
                    </Field>
                  </div>
                </div>

                <div className="p-4 rounded-xl bg-gray-50 border border-gray-100">
                  <div className="flex items-center gap-2 mb-2">
                    <FileText className="w-4 h-4 text-gray-500" />
                    <div className="text-xs text-gray-500 font-medium uppercase">Texte extrait</div>
                  </div>
                  <pre className="text-xs text-gray-600 whitespace-pre-wrap font-sans max-h-32 overflow-y-auto">{job.edited.content_text}</pre>
                </div>
              </div>

              <div className="flex gap-3 mt-5">
                <button onClick={() => { dismissJob(job.id); close(); }} className="flex-1 px-4 py-2.5 bg-white text-gray-600 border border-gray-200 rounded-xl text-sm font-medium hover:bg-gray-50 transition-colors">
                  Annuler
                </button>
                <button onClick={retryJob} className="flex-1 px-4 py-2.5 bg-gray-100 text-gray-700 rounded-xl text-sm font-medium hover:bg-gray-200 transition-colors">
                  Rescanner
                </button>
                <button onClick={handleSave} className="flex-1 px-4 py-2.5 bg-usps-blue text-white rounded-xl text-sm font-semibold shadow-sm hover:shadow-md transition-all">
                  Enregistrer le document
                </button>
              </div>
            </div>
          )}

          {/* Saved Stage */}
          {job?.stage === 'saved' && (
            <div className="py-16 text-center">
              <div className="w-16 h-16 rounded-full bg-emerald-100 flex items-center justify-center mx-auto mb-4">
                <Check className="w-8 h-8 text-emerald-600" />
              </div>
              <h3 className="font-semibold text-gray-900 mb-1">Document enregistré !</h3>
              <p className="text-sm text-gray-500">Votre document a été organisé et ajouté à vos documents.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
