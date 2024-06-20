import { SelectionModel } from '@angular/cdk/collections';
import { Component, Inject, OnInit, ViewChild } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialog, MatDialogRef, MatSort, MatTableDataSource } from '@angular/material';
import { forkJoin, Subscription } from 'rxjs';
import { FilesService } from '../files.service';
import { FuncCompSelectorComponent } from '../func-comp-selector/func-comp-selector.component';
import { GraphService } from '../graph.service';
import { LoginService } from '../login.service';
import { MetadataService } from '../metadata.service';

@Component({
  selector: 'app-download-graph',
  templateUrl: './download-graph.component.html',
  styleUrls: ['./download-graph.component.css']
})
export class DownloadGraphComponent implements OnInit {

  // modes
  static readonly DOWNLOAD_MODE = 1;
  static readonly IMPORT_MODE = 2;
  static readonly SELECT_MODE = 3;
  mode;

  // types
  static readonly MODULE_AND_COMPONENT_TYPE = 1;
  static readonly MODULE_TYPE = 2;
  static readonly COMPONENT_TYPE = 3;
  static readonly LAYOUT_TYPE = 4;
  static readonly COMBINATORIAL_TYPE = 5;
  type;

  static collectionType = "collection";
  static moduleType = "module definition";
  static componentType = "component definition";

  // This is so we can use static variables in the html checks
  classRef = DownloadGraphComponent;

  registries: string[];
  partTypes: string[];
  history: any[];
  partRoles: string[];
  roleRefinements: string[];

  registry: string;
  partType: string;
  collection: string;
  partRole: string;
  partRefine: string;

  partRequest: Subscription;

  parts = new MatTableDataSource([]);
  selection = new SelectionModel(false, []);

  displayedColumns: string[] = ['type', 'displayId', 'name', 'version', 'description'];
  @ViewChild(MatSort) sort: MatSort;

  working: boolean;

  constructor(@Inject(MAT_DIALOG_DATA) public data: any, private dialog: MatDialog, private metadataService: MetadataService, private graphService: GraphService, private filesService: FilesService, private loginService: LoginService, public dialogRef: MatDialogRef<DownloadGraphComponent>) { }

  ngOnInit() {


    console.log('####################### [ngOnInit]')
    this.working = true;



    if (this.data != null) {// data exist
      console.log('####################### [ngOnInit] this.data', this.data)
      if (this.data.mode != null) {
        this.mode = this.data.mode;
        if(this.mode == DownloadGraphComponent.SELECT_MODE){
          this.selection = new SelectionModel(true, []);
        }
      } else {
        this.mode = DownloadGraphComponent.DOWNLOAD_MODE;
      }


      console.log('####################### [ngOnInit] this.mode', this.mode)

      if (this.data.type != null) {
        this.type = this.data.type;
      } else {
        this.type = DownloadGraphComponent.MODULE_AND_COMPONENT_TYPE;
      }

      
      console.log('####################### [ngOnInit] this.type', this.type)
      console.log('####################### [ngOnInit] this.data.info', this.data.info)
      if (this.data.info != null) {


        this.partType = this.data.info.partType;
        this.partRole = this.data.info.partRole ? this.data.info.partRole : "";
        this.partRefine = this.data.info.partRefine;

        forkJoin(
          this.filesService.getRegistries(),
          this.metadataService.loadTypes(),
          this.metadataService.loadRoles(),
          this.metadataService.loadRefinements(this.partRole)
        ).subscribe(results => {
          this.registries = results[0];
          this.partTypes = results[1];
          this.partRoles = results[2];
          this.roleRefinements = results[3];
          this.working = false;
        });
      } else {
        this.filesService.getRegistries().subscribe(registries => {
          this.registries = registries;
          this.working = false;
        });
      }
    } else {


      this.mode = DownloadGraphComponent.DOWNLOAD_MODE;
      this.filesService.getRegistries().subscribe(registries => {
        this.registries = registries;
        this.working = false;
      });
    }




    this.updateParts();
    this.parts.sort = this.sort;
    this.history = [];
    this.collection = "";
  }

  loginDisabled(): boolean {
    return this.loginService.users[this.registry] != null || this.registry == null;
  }

  finishCheck(): boolean {
    return !this.selection.isEmpty() && this.noCollectionsSelected();
  }

  applyFilter(filterValue: string) {
    this.parts.filter = filterValue.trim().toLowerCase();
    console.log('♥ this.parts.filter(filter)....................',this.parts.filter)
    localStorage.setItem('6partFilter',this.parts.filter)  
    console.log('♥ .localStorage.getItem(\'partFilter\')',localStorage.getItem('6partFilter'))  
  }

  // start anaylize code
  setRegistry(registry: string) {
    localStorage.clear()
    this.registry = registry;
    console.log('♥ this.registry(Server)....................',this.registry)
    localStorage.setItem('1registry',this.registry)
    console.log('♥ .localStorage.getItem(\'registry\')',localStorage.getItem('1registry'))  
    this.updateParts();
  }

  setPartType(partType: string) {
    this.partType = partType;
    console.log('♥ this.partType(Part type)....................',this.partType)
    localStorage.setItem('2partType',this.partType)
    console.log('♥ .localStorage.getItem(\'partType\')',localStorage.getItem('2partType'))  
    this.updateParts();
  }

  setPartRole(partRole: string) {
    this.partRole = partRole;
    console.log('♥ this.partRole(Part role)....................',this.partRole)
    localStorage.setItem('4partRole',this.partRole)
    console.log('♥ .localStorage.getItem(\'partRole\')',localStorage.getItem('4partRole'))  
    // this.partRefine = null;
    // localStorage.setItem('5partRefine',this.partRefine)
    // console.log('♥ .localStorage.getItem(\'partRefine\')',localStorage.getItem('5partRefine'))  
    if (this.partRole != null && this.partRole.length > 0)
      this.updateRefinements();
    this.updateParts();
  }

  setPartRefinement(partRefine: string) {
    this.partRefine = partRefine;
    console.log('♥ this.partRefine(Role refinement)....................',this.partRefine)
    localStorage.setItem('5partRefine',this.partRefine)
    console.log('♥ .localStorage.getItem(\'partRefine\')',localStorage.getItem('5partRefine'))  
    this.updateParts();
  }

  onLoginClick() {
    this.loginService.openLoginDialog(this.registry).subscribe(result => {
      if (result) {
        this.updateParts();
      }
    });
  }

  async onLogoutClick() {
    this.working = true;
    await this.loginService.logout(this.registry);
    this.working = false;
    this.updateParts();
  }

  onCancelClick() {
    // when dialog is closed, save form data with localstorage
    console.log('♥onCancelClick')
    this.saveFormDataWithLocalStorage()

    this.dialogRef.close();
  }

  saveFormDataWithLocalStorage(){ 
 

    // console.log('♥ ........server(registry)',this.registry)
    // console.log('♥ ........part Type',this.partType)
    // console.log('♥ ........collection',this.collection)
    // console.log('♥ ........part Role',this.partRole)
    // console.log('♥ ........role Refinement',this.partRefine)
    // console.log('♥ ........filter',this.parts.filter)


  

    // this.updateParts();
  }

  onEnterCollectionClick(){
    // only allowed to get here when there is one item selected, and it's a collection
    let row = this.selection.selected[0];
    this.history.push(row);
    this.selection.clear();
    this.updateParts();
  }

  enterCollectionEnabled(): boolean {
    return this.selection.selected.length == 1 && this.selection.selected[0].type == DownloadGraphComponent.collectionType;
  }

  onDownloadClick() {
    if(this.selection.selected[0].type == DownloadGraphComponent.moduleType){
      this.downloadModule();
    } else if (this.selection.selected[0].type == DownloadGraphComponent.componentType) {
      this.downloadComponent();
    }
  }

  onSelectClick(){
    this.dialogRef.close(this.selection.selected);
  }

  selectCheck(){
    return !this.selection.isEmpty() && this.onlyComponentsAndCollectionsSelected();
  }

  updateRefinements() {
    this.working = true;
    this.metadataService.loadRefinements(this.partRole).subscribe(refinements => {
      this.roleRefinements = refinements;
      this.working = false;
    });
  }

  highlightRow(row: any) {
    return this.selection.isSelected(row);
  }

  onRowClick(row: any) {
    if (row.type === DownloadGraphComponent.collectionType) {
      this.collection = row.uri;
    }
    this.selection.toggle(row);
  }

  onRowDoubleClick(row: any) {
    // double clicks still cause onRowClick for single clicks, so we need to make sure the double clicked row is still selected
    this.selection.select(row);

    if (row.type === DownloadGraphComponent.collectionType) {
      this.history.push(row);
      this.collection = row.uri;
      this.selection.clear();
      this.updateParts();
    } else if (row.type === DownloadGraphComponent.componentType) {
      if(this.mode == DownloadGraphComponent.SELECT_MODE){
        this.onSelectClick();
      }else{
        this.downloadComponent();
      }
    } else if (row.type === DownloadGraphComponent.moduleType) {
      if(this.mode == DownloadGraphComponent.SELECT_MODE){
        this.onSelectClick();
      }else{
        this.downloadModule();
      }
    }
  }

  async downloadComponent() {
    this.working = true;
    if (this.mode == DownloadGraphComponent.IMPORT_MODE) {
      this.filesService.importPart(this.loginService.users[this.registry], this.registry, this.selection.selected[0].uri).subscribe(xml => {
        this.graphService.setSelectedToXML(xml);
        this.working = false;
        this.dialogRef.close();
      });
    } else {
      // check for combinatorials
      let combResult = await this.filesService.listCombinatorials(this.loginService.users[this.registry], this.registry, this.selection.selected[0].uri).toPromise();
      let combinatorial;
      if(combResult.length > 0){
        combinatorial = await this.dialog.open(FuncCompSelectorComponent, {
          data: {
            mode: FuncCompSelectorComponent.COMBINATORIAL_MODE,
            options: combResult
          }
        }).afterClosed().toPromise();
      }

      // get xml
      let xml;
      if(combinatorial){
        xml = await this.filesService.getPart(this.loginService.users[this.registry], this.registry, this.selection.selected[0].uri, combinatorial.uri).toPromise();
      }else{
        xml = await this.filesService.getPart(this.loginService.users[this.registry], this.registry, this.selection.selected[0].uri).toPromise();
      }

      // set xml;
      this.graphService.setGraphToXML(xml);
      
      // close dialog
      this.working = false;
      this.dialogRef.close();
    }
  }

  downloadModule() {
    this.working = true;
    if (this.mode == DownloadGraphComponent.IMPORT_MODE) {
      this.filesService.importPart(this.loginService.users[this.registry], this.registry, this.selection.selected[0].uri).subscribe(xml => {
        this.graphService.setSelectedToXML(xml);
        this.working = false;
        this.dialogRef.close();
      })
    } else {
      this.filesService.getPart(this.loginService.users[this.registry], this.registry, this.selection.selected[0].uri).subscribe(xml => {
        this.graphService.setGraphToXML(xml);
        this.working = false;
        this.dialogRef.close();
      });
    }
  }

  changeCollection(collection: string) {
    this.selection.clear();
    let found = false;
    for (let i = 0; i < this.history.length; i++) {
      if (this.history[i] === collection) {
        this.history.length = i + 1;
        found = true;
        break;
      }
    }
    if (!found)
      this.history.length = 0;
    this.collection = collection;

    console.log('♥ this.collection(Collection)....................',this.collection)
    localStorage.setItem('3collection',this.collection)
    console.log('♥ .localStorage.getItem(\'collection\')',localStorage.getItem('3collection'))  
    this.updateParts();
  }



  getMyHistory() {

    console.log('♥ .localStorage.getItem(\'registry\')',localStorage.getItem('1registry'))  
    console.log('♥ .localStorage.getItem(\'partType\')',localStorage.getItem('2partType'))  
    console.log('♥ .localStorage.getItem(\'collection\')',localStorage.getItem('3collection'))  
    console.log('♥ .localStorage.getItem(\'partRole\')',localStorage.getItem('4partRole'))  
    console.log('♥ .localStorage.getItem(\'partRefine\')',localStorage.getItem('5partRefine'))  
    console.log('♥ .localStorage.getItem(\'partFilter\')',localStorage.getItem('6partFilter'))  


    if(localStorage.getItem('1registry') != null && localStorage.getItem('1registry').length > 0)
    this.registry = localStorage.getItem('1registry')
    if(localStorage.getItem('2partType') != null && localStorage.getItem('2partType').length > 0)
    this.partType = localStorage.getItem('2partType')
    if(localStorage.getItem('3collection') != null && localStorage.getItem('3collection').length > 0)
    this.collection = localStorage.getItem('3collection')
    if(localStorage.getItem('4partRole') != null && localStorage.getItem('4partRole').length > 0)
    this.partRole = localStorage.getItem('4partRole')
    if(localStorage.getItem('5partRefine') != null && localStorage.getItem('5partRefine').length > 0)
    this.partRefine = localStorage.getItem('5partRefine')
    if(localStorage.getItem('6partFilter') != null && localStorage.getItem('6partFilter').length > 0)
    this.parts.filter = localStorage.getItem('6partFilter')
    
    console.log('♥ ........server(registry)',this.registry)
    console.log('♥ ........part Type',this.partType)
    console.log('♥ ........collection',this.collection)
    console.log('♥ ........part Role',this.partRole)
    console.log('♥ ........role Refinement',this.partRefine)
    console.log('♥ ........filter',this.parts.filter)
  }

  updateParts() {
    console.log('########################### updateParts')

    this.getMyHistory()

    console.log('♥ ....................this.parts.data',this.parts.data)
    console.log('♥ ....................this.type',this.type)

    if (this.partRequest && !this.partRequest.closed) {
      console.log('♥ this way....................this.partRequest',this.partRequest)
      this.partRequest.unsubscribe();
    }

    if (this.registry != null) {
      console.log('♥ 1....................this.registry',this.registry)
      console.log('♥ 1....................this.type',this.type)
      console.log('♥ 1....................DownloadGraphComponent.COMPONENT_TYPE',DownloadGraphComponent.COMPONENT_TYPE)
      this.working = true;
      this.parts.data = [];
      if (this.type == DownloadGraphComponent.COMPONENT_TYPE) {
        console.log('♥ this type....................this.COMPONENT_TYPE',this.type)
        // collection and components
        let roleOrRefine = this.partRefine != null && this.partRefine.length > 0 ? this.partRefine : this.partRole;
        this.partRequest = forkJoin(
          this.filesService.listParts(this.loginService.users[this.registry], this.registry, this.collection, null, null, "collections"),
          this.filesService.listParts(this.loginService.users[this.registry], this.registry, this.collection, this.partType, roleOrRefine, "components")
        ).subscribe(parts => {
          let partCache = [];
          parts[0].forEach(part => {
            part.type = DownloadGraphComponent.collectionType;
            partCache.push(part);
          });
          parts[1].forEach(part => {
            part.type = DownloadGraphComponent.componentType;
            partCache.push(part);
          });
          this.parts.data = partCache;
          this.working = false;
        })
      } else if(this.type == DownloadGraphComponent.MODULE_TYPE){
        console.log('♥ this type....................this.MODULE_TYPE',this.type)
        // collections and modules
        this.partRequest = forkJoin(
          this.filesService.listParts(this.loginService.users[this.registry], this.registry, this.collection, null, null, "collections"),
          this.filesService.listParts(this.loginService.users[this.registry], this.registry, this.collection, null, null, "modules")
        ).subscribe(parts =>{
          let partCache = [];
          parts[0].forEach(part => {
            part.type = DownloadGraphComponent.collectionType;
            partCache.push(part);
          });
          parts[1].forEach(part => {
            part.type = DownloadGraphComponent.moduleType;
            partCache.push(part);
          });
          this.parts.data = partCache;
          this.working = false;
        });
      }else{
        console.log('♥ this type....................this.other',this.type)
        // collection, modules, and components
        this.partRequest = forkJoin(
          this.filesService.listParts(this.loginService.users[this.registry], this.registry, this.collection, null, null, "collections"),
          this.filesService.listParts(this.loginService.users[this.registry], this.registry, this.collection, null, null, "modules"),
          this.filesService.listParts(this.loginService.users[this.registry], this.registry, this.collection, null, null, "components")
        ).subscribe(parts => {
          let partCache = [];
          parts[0].forEach(part => {
            part.type = DownloadGraphComponent.collectionType;
            partCache.push(part);
          });
          parts[1].forEach(part => {
            part.type = DownloadGraphComponent.moduleType;
            partCache.push(part);
          });
          parts[2].forEach(part => {
            part.type = DownloadGraphComponent.componentType;
            partCache.push(part);
          })
          this.parts.data = partCache;
          this.working = false;
        });
      }
    } else {
      console.log('♥ this way....................this.registry',this.registry)
      this.parts.data = [];
    }
  }

  protected noCollectionsSelected(){
    for(let row of this.selection.selected){
      if(row.type == DownloadGraphComponent.collectionType){
        return false;
      }
    }
    return true;
  }

  protected onlyComponentsAndCollectionsSelected(){
    for(let row of this.selection.selected){
      if(row.type != DownloadGraphComponent.componentType && row.type != DownloadGraphComponent.collectionType){
        return false;
      }
    }
    return true;
  }

}
