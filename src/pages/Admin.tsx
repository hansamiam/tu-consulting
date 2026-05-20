import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import Navigation from "@/components/Navigation";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useNavigate } from "react-router-dom";
import { Plus, Trash2, Edit, LogIn, GraduationCap, Building, Award, FileText, Database, ListChecks, BarChart3, Inbox } from "lucide-react";
import { toast } from "@/hooks/use-toast";

const Admin = () => {
  const nav = useNavigate();
  const [user, setUser] = useState<any>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [authLoading, setAuthLoading] = useState(false);

  // Data states
  const [universities, setUniversities] = useState<any[]>([]);
  const [programs, setPrograms] = useState<any[]>([]);
  const [scholarships, setScholarships] = useState<any[]>([]);
  const [requirements, setRequirements] = useState<any[]>([]);

  // Form states
  const [uniForm, setUniForm] = useState({ university_name: "", country: "", city: "", global_ranking: "", tuition_usd_per_year: "", cost_of_living_index: "", language_of_instruction: "English", website_url: "" });
  const [progForm, setProgForm] = useState({ university_id: "", program_name: "", degree_level: "bachelor", field_of_study: "", duration_years: "" });
  const [scholForm, setScholForm] = useState({ university_id: "", scholarship_name: "", coverage_type: "full ride", stipend_amount: "", eligibility_requirements: "", application_deadline: "" });
  const [reqForm, setReqForm] = useState({ program_id: "", ielts_required: "true", ielts_score_min: "", sat_required: "false", sat_score_min: "", gpa_min: "", application_deadline: "" });

  const [editingUni, setEditingUni] = useState<string | null>(null);
  const [dialogOpen, setDialogOpen] = useState<Record<string, boolean>>({});

  useEffect(() => {
    checkAuth();
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      if (session?.user) checkAdminRole(session.user.id);
      else { setIsAdmin(false); setLoading(false); }
    });
    return () => subscription.unsubscribe();
  }, []);

  const checkAuth = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    setUser(session?.user ?? null);
    if (session?.user) await checkAdminRole(session.user.id);
    else setLoading(false);
  };

  const checkAdminRole = async (userId: string) => {
    const { data } = await supabase.from("user_roles").select("role").eq("user_id", userId).eq("role", "admin").maybeSingle();
    setIsAdmin(!!data);
    if (data) fetchAllData();
    setLoading(false);
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) toast({ title: "Login failed", description: error.message, variant: "destructive" });
    setAuthLoading(false);
  };

  const fetchAllData = async () => {
    const [u, p, s, r] = await Promise.all([
      supabase.from("universities").select("*").order("global_ranking", { ascending: true, nullsFirst: false }),
      supabase.from("programs").select("*, universities(university_name)").order("program_name"),
      supabase.from("scholarships").select("*, universities(university_name)").order("scholarship_name"),
      supabase.from("admission_requirements").select("*, programs(program_name)").order("created_at"),
    ]);
    if (u.data) setUniversities(u.data);
    if (p.data) setPrograms(p.data);
    if (s.data) setScholarships(s.data);
    if (r.data) setRequirements(r.data);
  };

  // CRUD operations
  const addUniversity = async () => {
    const payload: any = {
      university_name: uniForm.university_name,
      country: uniForm.country,
      city: uniForm.city,
      language_of_instruction: uniForm.language_of_instruction,
      website_url: uniForm.website_url || null,
      global_ranking: uniForm.global_ranking ? Number(uniForm.global_ranking) : null,
      tuition_usd_per_year: uniForm.tuition_usd_per_year ? Number(uniForm.tuition_usd_per_year) : null,
      cost_of_living_index: uniForm.cost_of_living_index ? Number(uniForm.cost_of_living_index) : null,
    };
    const { error } = editingUni
      ? await (supabase.from("universities").update(payload) as any).eq("university_id", editingUni)
      : await supabase.from("universities").insert(payload);
    if (error) { toast({ title: "Error", description: error.message, variant: "destructive" }); return; }
    toast({ title: editingUni ? "Updated" : "Added", description: `University ${editingUni ? "updated" : "added"} successfully.` });
    setUniForm({ university_name: "", country: "", city: "", global_ranking: "", tuition_usd_per_year: "", cost_of_living_index: "", language_of_instruction: "English", website_url: "" });
    setEditingUni(null);
    setDialogOpen({ ...dialogOpen, uni: false });
    fetchAllData();
  };

  const addProgram = async () => {
    const payload = { ...progForm, duration_years: progForm.duration_years ? Number(progForm.duration_years) : null };
    const { error } = await supabase.from("programs").insert(payload);
    if (error) { toast({ title: "Error", description: error.message, variant: "destructive" }); return; }
    toast({ title: "Added", description: "Program added." });
    setProgForm({ university_id: "", program_name: "", degree_level: "bachelor", field_of_study: "", duration_years: "" });
    setDialogOpen({ ...dialogOpen, prog: false });
    fetchAllData();
  };

  const addScholarship = async () => {
    const payload = { ...scholForm, stipend_amount: scholForm.stipend_amount ? Number(scholForm.stipend_amount) : null, application_deadline: scholForm.application_deadline || null };
    const { error } = await supabase.from("scholarships").insert(payload);
    if (error) { toast({ title: "Error", description: error.message, variant: "destructive" }); return; }
    toast({ title: "Added", description: "Scholarship added." });
    setScholForm({ university_id: "", scholarship_name: "", coverage_type: "full ride", stipend_amount: "", eligibility_requirements: "", application_deadline: "" });
    setDialogOpen({ ...dialogOpen, schol: false });
    fetchAllData();
  };

  const addRequirement = async () => {
    const payload = {
      program_id: reqForm.program_id,
      ielts_required: reqForm.ielts_required === "true",
      ielts_score_min: reqForm.ielts_score_min ? Number(reqForm.ielts_score_min) : null,
      sat_required: reqForm.sat_required === "true",
      sat_score_min: reqForm.sat_score_min ? Number(reqForm.sat_score_min) : null,
      gpa_min: reqForm.gpa_min ? Number(reqForm.gpa_min) : null,
      application_deadline: reqForm.application_deadline || null,
    };
    const { error } = await supabase.from("admission_requirements").insert(payload);
    if (error) { toast({ title: "Error", description: error.message, variant: "destructive" }); return; }
    toast({ title: "Added", description: "Requirement added." });
    setReqForm({ program_id: "", ielts_required: "true", ielts_score_min: "", sat_required: "false", sat_score_min: "", gpa_min: "", application_deadline: "" });
    setDialogOpen({ ...dialogOpen, req: false });
    fetchAllData();
  };

  const deleteRecord = async (table: string, idCol: string, id: string) => {
    const { error } = await (supabase.from(table as any).delete() as any).eq(idCol, id);
    if (error) toast({ title: "Error", description: error.message, variant: "destructive" });
    else { toast({ title: "Deleted" }); fetchAllData(); }
  };

  if (loading) return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <div className="animate-pulse text-muted-foreground">Loading...</div>
    </div>
  );

  if (!user || !isAdmin) return (
    <div className="min-h-screen bg-background">
      <Navigation language="en" />
      <div className="max-w-md mx-auto px-4 py-20">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <LogIn className="h-5 w-5" /> Admin Login
            </CardTitle>
          </CardHeader>
          <CardContent>
            {user && !isAdmin ? (
              <p className="text-destructive text-sm">You don't have admin access. Contact the administrator.</p>
            ) : (
              <form onSubmit={handleLogin} className="space-y-4">
                <div>
                  <Label>Email</Label>
                  <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
                </div>
                <div>
                  <Label>Password</Label>
                  <Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
                </div>
                <Button type="submit" className="w-full" disabled={authLoading}>
                  {authLoading ? "Logging in..." : "Login"}
                </Button>
              </form>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-background">
      <Navigation language="en" />
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
          <h1 className="text-2xl font-heading font-bold text-foreground">TopUni Admin</h1>
          <div className="flex gap-2 flex-wrap">
            <Button variant="outline" size="sm" onClick={() => nav("/admin/sources")} className="gap-1.5"><Database className="h-4 w-4" />Sources pipeline</Button>
            <Button variant="outline" size="sm" onClick={() => nav("/admin/queue")} className="gap-1.5"><ListChecks className="h-4 w-4" />AI scrape queue</Button>
            <Button variant="outline" size="sm" onClick={() => nav("/admin/submissions")} className="gap-1.5"><Inbox className="h-4 w-4" />User submissions</Button>
            <Button variant="outline" size="sm" onClick={() => nav("/admin/partner-inquiries")} className="gap-1.5"><Inbox className="h-4 w-4" />Partner inquiries</Button>
            <Button variant="outline" size="sm" onClick={() => nav("/admin/academy/resources")} className="gap-1.5"><FileText className="h-4 w-4" />Academy resources</Button>
            <Button variant="outline" size="sm" onClick={() => nav("/admin/insights")} className="gap-1.5"><BarChart3 className="h-4 w-4" />Insights</Button>
            <Button variant="outline" size="sm" onClick={() => supabase.auth.signOut()}>Sign out</Button>
          </div>
        </div>

        <Tabs defaultValue="universities">
          <TabsList className="mb-6">
            <TabsTrigger value="universities" className="gap-1.5"><Building className="h-4 w-4" />Universities ({universities.length})</TabsTrigger>
            <TabsTrigger value="programs" className="gap-1.5"><GraduationCap className="h-4 w-4" />Programs ({programs.length})</TabsTrigger>
            <TabsTrigger value="scholarships" className="gap-1.5"><Award className="h-4 w-4" />Scholarships ({scholarships.length})</TabsTrigger>
            <TabsTrigger value="requirements" className="gap-1.5"><FileText className="h-4 w-4" />Requirements ({requirements.length})</TabsTrigger>
          </TabsList>

          {/* Universities Tab */}
          <TabsContent value="universities">
            <div className="flex justify-end mb-4">
              <Dialog open={dialogOpen.uni} onOpenChange={(o) => { setDialogOpen({ ...dialogOpen, uni: o }); if (!o) { setEditingUni(null); setUniForm({ university_name: "", country: "", city: "", global_ranking: "", tuition_usd_per_year: "", cost_of_living_index: "", language_of_instruction: "English", website_url: "" }); } }}>
                <DialogTrigger asChild>
                  <Button size="sm"><Plus className="h-4 w-4 mr-1" />Add University</Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader><DialogTitle>{editingUni ? "Edit" : "Add"} University</DialogTitle></DialogHeader>
                  <div className="space-y-3">
                    <div><Label>Name *</Label><Input value={uniForm.university_name} onChange={(e) => setUniForm({ ...uniForm, university_name: e.target.value })} /></div>
                    <div className="grid grid-cols-2 gap-3">
                      <div><Label>Country *</Label><Input value={uniForm.country} onChange={(e) => setUniForm({ ...uniForm, country: e.target.value })} /></div>
                      <div><Label>City *</Label><Input value={uniForm.city} onChange={(e) => setUniForm({ ...uniForm, city: e.target.value })} /></div>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div><Label>Ranking</Label><Input type="number" value={uniForm.global_ranking} onChange={(e) => setUniForm({ ...uniForm, global_ranking: e.target.value })} /></div>
                      <div><Label>Tuition (USD/yr)</Label><Input type="number" value={uniForm.tuition_usd_per_year} onChange={(e) => setUniForm({ ...uniForm, tuition_usd_per_year: e.target.value })} /></div>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div><Label>Cost of Living Index</Label><Input type="number" value={uniForm.cost_of_living_index} onChange={(e) => setUniForm({ ...uniForm, cost_of_living_index: e.target.value })} /></div>
                      <div><Label>Language</Label><Input value={uniForm.language_of_instruction} onChange={(e) => setUniForm({ ...uniForm, language_of_instruction: e.target.value })} /></div>
                    </div>
                    <div><Label>Website URL</Label><Input value={uniForm.website_url} onChange={(e) => setUniForm({ ...uniForm, website_url: e.target.value })} /></div>
                    <Button onClick={addUniversity} className="w-full">{editingUni ? "Update" : "Add"} University</Button>
                  </div>
                </DialogContent>
              </Dialog>
            </div>
            <Card>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Country</TableHead>
                      <TableHead>City</TableHead>
                      <TableHead>Rank</TableHead>
                      <TableHead>Tuition</TableHead>
                      <TableHead className="w-[80px]"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {universities.map((u) => (
                      <TableRow key={u.university_id}>
                        <TableCell className="font-medium">{u.university_name}</TableCell>
                        <TableCell>{u.country}</TableCell>
                        <TableCell>{u.city}</TableCell>
                        <TableCell>{u.global_ranking ?? "—"}</TableCell>
                        <TableCell>{u.tuition_usd_per_year ? `$${u.tuition_usd_per_year.toLocaleString()}` : "—"}</TableCell>
                        <TableCell>
                          <div className="flex gap-1">
                            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => {
                              setEditingUni(u.university_id);
                              setUniForm({
                                university_name: u.university_name, country: u.country, city: u.city,
                                global_ranking: u.global_ranking?.toString() ?? "", tuition_usd_per_year: u.tuition_usd_per_year?.toString() ?? "",
                                cost_of_living_index: u.cost_of_living_index?.toString() ?? "", language_of_instruction: u.language_of_instruction ?? "English",
                                website_url: u.website_url ?? "",
                              });
                              setDialogOpen({ ...dialogOpen, uni: true });
                            }}>
                              <Edit className="h-3.5 w-3.5" />
                            </Button>
                            <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => deleteRecord("universities", "university_id", u.university_id)}>
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                    {universities.length === 0 && (
                      <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground py-8">No universities yet. Add one above.</TableCell></TableRow>
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Programs Tab */}
          <TabsContent value="programs">
            <div className="flex justify-end mb-4">
              <Dialog open={dialogOpen.prog} onOpenChange={(o) => setDialogOpen({ ...dialogOpen, prog: o })}>
                <DialogTrigger asChild><Button size="sm"><Plus className="h-4 w-4 mr-1" />Add Program</Button></DialogTrigger>
                <DialogContent>
                  <DialogHeader><DialogTitle>Add Program</DialogTitle></DialogHeader>
                  <div className="space-y-3">
                    <div>
                      <Label>University *</Label>
                      <Select value={progForm.university_id} onValueChange={(v) => setProgForm({ ...progForm, university_id: v })}>
                        <SelectTrigger><SelectValue placeholder="Select university" /></SelectTrigger>
                        <SelectContent>{universities.map((u) => <SelectItem key={u.university_id} value={u.university_id}>{u.university_name}</SelectItem>)}</SelectContent>
                      </Select>
                    </div>
                    <div><Label>Program Name *</Label><Input value={progForm.program_name} onChange={(e) => setProgForm({ ...progForm, program_name: e.target.value })} /></div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <Label>Degree Level *</Label>
                        <Select value={progForm.degree_level} onValueChange={(v) => setProgForm({ ...progForm, degree_level: v })}>
                          <SelectTrigger><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="bachelor">Bachelor</SelectItem>
                            <SelectItem value="master">Master</SelectItem>
                            <SelectItem value="phd">PhD</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div><Label>Duration (years)</Label><Input type="number" value={progForm.duration_years} onChange={(e) => setProgForm({ ...progForm, duration_years: e.target.value })} /></div>
                    </div>
                    <div><Label>Field of Study *</Label><Input value={progForm.field_of_study} onChange={(e) => setProgForm({ ...progForm, field_of_study: e.target.value })} /></div>
                    <Button onClick={addProgram} className="w-full">Add Program</Button>
                  </div>
                </DialogContent>
              </Dialog>
            </div>
            <Card>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Program</TableHead>
                      <TableHead>University</TableHead>
                      <TableHead>Level</TableHead>
                      <TableHead>Field</TableHead>
                      <TableHead>Duration</TableHead>
                      <TableHead className="w-[50px]"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {programs.map((p) => (
                      <TableRow key={p.program_id}>
                        <TableCell className="font-medium">{p.program_name}</TableCell>
                        <TableCell>{(p as any).universities?.university_name ?? "—"}</TableCell>
                        <TableCell className="capitalize">{p.degree_level}</TableCell>
                        <TableCell>{p.field_of_study}</TableCell>
                        <TableCell>{p.duration_years ? `${p.duration_years}yr` : "—"}</TableCell>
                        <TableCell>
                          <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => deleteRecord("programs", "program_id", p.program_id)}>
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                    {programs.length === 0 && <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground py-8">No programs yet.</TableCell></TableRow>}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Scholarships Tab */}
          <TabsContent value="scholarships">
            <div className="flex justify-end mb-4">
              <Dialog open={dialogOpen.schol} onOpenChange={(o) => setDialogOpen({ ...dialogOpen, schol: o })}>
                <DialogTrigger asChild><Button size="sm"><Plus className="h-4 w-4 mr-1" />Add Scholarship</Button></DialogTrigger>
                <DialogContent>
                  <DialogHeader><DialogTitle>Add Scholarship</DialogTitle></DialogHeader>
                  <div className="space-y-3">
                    <div>
                      <Label>University *</Label>
                      <Select value={scholForm.university_id} onValueChange={(v) => setScholForm({ ...scholForm, university_id: v })}>
                        <SelectTrigger><SelectValue placeholder="Select university" /></SelectTrigger>
                        <SelectContent>{universities.map((u) => <SelectItem key={u.university_id} value={u.university_id}>{u.university_name}</SelectItem>)}</SelectContent>
                      </Select>
                    </div>
                    <div><Label>Name *</Label><Input value={scholForm.scholarship_name} onChange={(e) => setScholForm({ ...scholForm, scholarship_name: e.target.value })} /></div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <Label>Coverage *</Label>
                        <Select value={scholForm.coverage_type} onValueChange={(v) => setScholForm({ ...scholForm, coverage_type: v })}>
                          <SelectTrigger><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="full ride">Full Ride</SelectItem>
                            <SelectItem value="tuition only">Tuition Only</SelectItem>
                            <SelectItem value="stipend">Stipend</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div><Label>Stipend Amount</Label><Input type="number" value={scholForm.stipend_amount} onChange={(e) => setScholForm({ ...scholForm, stipend_amount: e.target.value })} /></div>
                    </div>
                    <div><Label>Eligibility</Label><Textarea value={scholForm.eligibility_requirements} onChange={(e) => setScholForm({ ...scholForm, eligibility_requirements: e.target.value })} /></div>
                    <div><Label>Deadline</Label><Input type="date" value={scholForm.application_deadline} onChange={(e) => setScholForm({ ...scholForm, application_deadline: e.target.value })} /></div>
                    <Button onClick={addScholarship} className="w-full">Add Scholarship</Button>
                  </div>
                </DialogContent>
              </Dialog>
            </div>
            <Card>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Scholarship</TableHead>
                      <TableHead>University</TableHead>
                      <TableHead>Coverage</TableHead>
                      <TableHead>Stipend</TableHead>
                      <TableHead>Deadline</TableHead>
                      <TableHead className="w-[50px]"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {scholarships.map((s) => (
                      <TableRow key={s.scholarship_id}>
                        <TableCell className="font-medium">{s.scholarship_name}</TableCell>
                        <TableCell>{(s as any).universities?.university_name ?? "—"}</TableCell>
                        <TableCell className="capitalize">{s.coverage_type}</TableCell>
                        <TableCell>{s.stipend_amount ? `$${s.stipend_amount.toLocaleString()}` : "—"}</TableCell>
                        <TableCell>{s.application_deadline ?? "—"}</TableCell>
                        <TableCell>
                          <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => deleteRecord("scholarships", "scholarship_id", s.scholarship_id)}>
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                    {scholarships.length === 0 && <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground py-8">No scholarships yet.</TableCell></TableRow>}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Requirements Tab */}
          <TabsContent value="requirements">
            <div className="flex justify-end mb-4">
              <Dialog open={dialogOpen.req} onOpenChange={(o) => setDialogOpen({ ...dialogOpen, req: o })}>
                <DialogTrigger asChild><Button size="sm"><Plus className="h-4 w-4 mr-1" />Add Requirement</Button></DialogTrigger>
                <DialogContent>
                  <DialogHeader><DialogTitle>Add Admission Requirement</DialogTitle></DialogHeader>
                  <div className="space-y-3">
                    <div>
                      <Label>Program *</Label>
                      <Select value={reqForm.program_id} onValueChange={(v) => setReqForm({ ...reqForm, program_id: v })}>
                        <SelectTrigger><SelectValue placeholder="Select program" /></SelectTrigger>
                        <SelectContent>{programs.map((p) => <SelectItem key={p.program_id} value={p.program_id}>{p.program_name}</SelectItem>)}</SelectContent>
                      </Select>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <Label>IELTS Required</Label>
                        <Select value={reqForm.ielts_required} onValueChange={(v) => setReqForm({ ...reqForm, ielts_required: v })}>
                          <SelectTrigger><SelectValue /></SelectTrigger>
                          <SelectContent><SelectItem value="true">Yes</SelectItem><SelectItem value="false">No</SelectItem></SelectContent>
                        </Select>
                      </div>
                      <div><Label>IELTS Min Score</Label><Input type="number" step="0.5" value={reqForm.ielts_score_min} onChange={(e) => setReqForm({ ...reqForm, ielts_score_min: e.target.value })} /></div>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <Label>SAT Required</Label>
                        <Select value={reqForm.sat_required} onValueChange={(v) => setReqForm({ ...reqForm, sat_required: v })}>
                          <SelectTrigger><SelectValue /></SelectTrigger>
                          <SelectContent><SelectItem value="true">Yes</SelectItem><SelectItem value="false">No</SelectItem></SelectContent>
                        </Select>
                      </div>
                      <div><Label>SAT Min Score</Label><Input type="number" value={reqForm.sat_score_min} onChange={(e) => setReqForm({ ...reqForm, sat_score_min: e.target.value })} /></div>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div><Label>GPA Min</Label><Input type="number" step="0.1" value={reqForm.gpa_min} onChange={(e) => setReqForm({ ...reqForm, gpa_min: e.target.value })} /></div>
                      <div><Label>Deadline</Label><Input type="date" value={reqForm.application_deadline} onChange={(e) => setReqForm({ ...reqForm, application_deadline: e.target.value })} /></div>
                    </div>
                    <Button onClick={addRequirement} className="w-full">Add Requirement</Button>
                  </div>
                </DialogContent>
              </Dialog>
            </div>
            <Card>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Program</TableHead>
                      <TableHead>IELTS</TableHead>
                      <TableHead>SAT</TableHead>
                      <TableHead>GPA Min</TableHead>
                      <TableHead>Deadline</TableHead>
                      <TableHead className="w-[50px]"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {requirements.map((r) => (
                      <TableRow key={r.requirement_id}>
                        <TableCell className="font-medium">{(r as any).programs?.program_name ?? "—"}</TableCell>
                        <TableCell>{r.ielts_required ? `Yes (${r.ielts_score_min ?? "—"})` : "No"}</TableCell>
                        <TableCell>{r.sat_required ? `Yes (${r.sat_score_min ?? "—"})` : "No"}</TableCell>
                        <TableCell>{r.gpa_min ?? "—"}</TableCell>
                        <TableCell>{r.application_deadline ?? "—"}</TableCell>
                        <TableCell>
                          <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => deleteRecord("admission_requirements", "requirement_id", r.requirement_id)}>
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                    {requirements.length === 0 && <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground py-8">No requirements yet.</TableCell></TableRow>}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default Admin;
