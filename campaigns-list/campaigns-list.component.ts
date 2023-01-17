import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormControl, FormGroup } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { AccountService } from '@appcore/services/account.service';
import { TableStorageService } from '@appcore/services/table-storage.service';
import { CampaignService } from '@appcore/services/campaign.service';
import { AppConfigService } from '@appconfig/app-config.service';
import { LoggedInUser } from '@appcore/authentication/LoggedInUser';
import { AuthenticationService } from '@appcore/authentication';
import {
	faCube, faEllipsisV, faPencilAlt, faClipboard, faSearch, faSort, faArrowUp, faArrowDown, 
} from "@fortawesome/pro-regular-svg-icons";
import {faPlus} from "@fortawesome/pro-solid-svg-icons";
import { intersectionBy } from 'lodash';
import { BsModalService } from 'ngx-bootstrap';
import { forkJoin, Subject, Subscription } from 'rxjs';
import { AddNewCampaignComponent } from '../add-new-campaign/add-new-campaign.component';
import { CopyCampaignComponent } from '../copy-campaign/copy-campaign.component';
import { debounceTime, distinctUntilChanged, takeUntil } from 'rxjs/operators';
import { campaignCandidateConfig, campaignDetailConfig, campaignListConfig, CampaignSearchOptions } from '@appcore/model/CampaignModels/campaignDto';

import { DatelocalPipe } from '../../shared/pipe/datelocal.pipe';


@Component({
	selector: 'app-campaigns-list',
	templateUrl: './campaigns-list.component.html',
	styleUrls: ['./campaigns-list.component.scss']
})

export class CampaignsListComponent implements OnInit {
	fa = {
		faCube, faEllipsisV, faPencilAlt, faClipboard, faPlus, faSearch, faSort, faArrowUp, faArrowDown
	};

	campaignSearchOptions: CampaignSearchOptions = {};
	accountList: any;
	campaignEnabledAccountIds: any[];
	plannerAccountList: any;
	campaignsList: any;
	campaignsListForm: FormGroup;
	selectedAccountInfo : any;
	singleMailBoxAccount : boolean;
	private engagementTableConfig = AppConfigService.engagementConfigObj;
	private _tableStorage 				: TableStorageService;
	loggedInUser : LoggedInUser;
	subscriptions: Subscription[] = [];
	displaySearchBar = false;
	displaySortOptions = false;
	totalCampaigns: number;

	sortValues = [
		{ Key: "CreatedOn", Value: "Created On" },
		{ Key: "UpdatedOn", Value: "Updated On" }
	];
	destroy$ = new Subject();

	constructor(
		private accountService				: AccountService,
		private modalService          : BsModalService,
		private http             			: HttpClient,
		private campaignService				: CampaignService,
		private authenticationService : AuthenticationService,	
		private fb										: FormBuilder,
		private dateLocal     				: DatelocalPipe,
	){
		this._tableStorage = new TableStorageService(this.http, this.engagementTableConfig.name, this.engagementTableConfig.key);
		this.campaignsListForm = this.fb.group({
			AccountId : new FormControl(null),
			SearchText : new FormControl(null),
			OrderBy : new FormControl('CreatedOn'),
			SortOrder : new FormControl('DESC'),
		});

		this.campaignSearchOptions.AccountId = this.campaignsListForm.value.AccountId;
		this.campaignSearchOptions.OrderBy = this.campaignsListForm.value.OrderBy;
		this.campaignSearchOptions.SortOrder = this.campaignsListForm.value.SortOrder;
		this.campaignSearchOptions.PageNo = 1;
		this.campaignSearchOptions.NoOfRecordsPerPage = AppConfigService.noOfRecordsPerPage;
	}
	
	ngOnInit() {
		this.loggedInUser = this.authenticationService.loggedInUser;
		this.campaignsList = [];
		this.getBaseData();

		this.campaignsListForm.controls.SearchText.valueChanges.pipe(
			takeUntil(this.destroy$),
			debounceTime(700), 
			distinctUntilChanged()
		).subscribe(() => {
			this.campaignSearchOptions.SearchText = this.campaignsListForm.value.SearchText;
			this.loadCampaignsList();
		}
		);
	}

	getBaseData(){
		forkJoin([this.accountService.getAccount(),this._tableStorage.getTableObj('accfunctionmappings')]).subscribe(response => {
			this.accountList 									= response[0];
			this.campaignEnabledAccountIds		= response[1].reduce(function (arr, obj) { if (obj.accfuncCampaign) arr.push({'AccountId': obj.AccountId}); return arr; }, []);
			this.plannerAccountList      		  = intersectionBy(this.accountList,this.campaignEnabledAccountIds, 'AccountId');
			
			if(this.plannerAccountList.length>=1){
				if(!CampaignService.campaignFilterReset){		//condition is true on the first load and selects the first account in the list.
					this.campaignsListForm.patchValue({AccountId : this.plannerAccountList[0].AccountId});
				}
				this.campaignSearchOptions.AccountId = this.campaignsListForm.value.AccountId;
				this.loadCampaignsList();
				this.getAccountData();
			}
		});	
		if(CampaignService.campaignFilterReset){	
			CampaignService.campaignFilterReset.PageNo = this.campaignSearchOptions.PageNo; 	//pageno = 1
			CampaignService.campaignFilterReset.NoOfRecordsPerPage = AppConfigService.noOfRecordsPerPage;		//noOf recordsPer Page = 20
			let saveData = CampaignService.campaignFilterReset;
			this.campaignsListForm.patchValue({
				AccountId  : saveData.AccountId,
				SearchText : saveData.SearchText,
				OrderBy 	 : saveData.OrderBy,
				SortOrder  : saveData.SortOrder,
			})
			this.campaignSearchOptions = saveData;
		}
	}


	onAccountChange() {
		if(!this.campaignsListForm.value.AccountId) return;
		this.campaignSearchOptions.AccountId = this.campaignsListForm.value.AccountId;

		if(this.campaignSearchOptions.SearchText == null){
			this.loadCampaignsList();				// we need to load the fresh list when changing account 
		}else{
			this.campaignSearchOptions.SearchText = null;
			this.campaignsListForm.patchValue({SearchText : null});  	// No need to load the list from here. It will get trigger from the valueChanges of SearchText.
		}
		this.getAccountData();
	}

	changeSortOrder(){
		this.campaignSearchOptions.OrderBy = this.campaignsListForm.value.OrderBy;
		this.campaignSearchOptions.SortOrder = this.campaignsListForm.value.SortOrder;
		this.loadCampaignsList();
	}

	loadCampaignsList(){
		this.getCampaignsList().subscribe((response : campaignListConfig) => {
			this.campaignsList = response.Campaigns;
			this.totalCampaigns = response.Count;
			this.displaySearchBar = true;
			if(this.campaignsList.length>0){
				this.displaySortOptions = true;
			}else{
				this.displaySortOptions = false;  // till the api loads the result, sort bar will remain visble.
			}
		});
			CampaignService.campaignFilterReset = this.campaignsListForm.value;
	}


	getAccountData(){
		this.singleMailBoxAccount = false;
		this.accountService.getAccount(this.campaignsListForm.value.AccountId).subscribe((response) => {
			this.selectedAccountInfo = response[0];
			if(this.selectedAccountInfo.UseAccountEmailConfig && this.selectedAccountInfo.UseAccountPersonalMail){
				this.singleMailBoxAccount = true;
			}
		});
	}

	createNewCampaign(){
		if(!this.campaignsListForm.value.AccountId) return;
		this.openAddNewCampaignModal(false,false);	//edit: false, copy: false
	}

	editCampaign(campaign: campaignDetailConfig){
		this.campaignSearchOptions.campaignId = campaign.CampaignId;
		this.campaignSearchOptions.isForEdit = true;
		forkJoin([this.getTriggerConfigurations(),this.getCandidates()]).subscribe((response)=>{
			this.openAddNewCampaignModal(true, false, campaign, response[0], response[1]);	//edit: true, copy: false, template, candidates
		});
	}

	openAddNewCampaignModal(isEdit: boolean, isForCopy: boolean, campaignDetails?: campaignDetailConfig, templates?:any, candidatesList?:any){
		let initialState = {
			AccountId : this.campaignsListForm.value.AccountId,
			isEdit : isEdit,
			isForCopy : isForCopy,
			singleMailBoxAccount : this.singleMailBoxAccount
		};

		if(campaignDetails){
			initialState["campaignDetails"] = campaignDetails;
		}
		if(candidatesList){
			initialState["candidatesList"] = candidatesList;
		}
		if(templates){
				initialState["templates"] = templates;
		}
		this.modalService.show(AddNewCampaignComponent, { initialState, class: 'modal-lg', ignoreBackdropClick: true 	});
		this.subscriptions.push(
			this.modalService.onHidden.subscribe(() => {
				delete this.campaignSearchOptions.campaignId;
				delete this.campaignSearchOptions.isForCopy;
				delete this.campaignSearchOptions.isForEdit;
				this.loadCampaignsList();
				this.unsubscribe();
			})
		);
	}

	unsubscribe() {
		this.subscriptions[0].unsubscribe();
		this.subscriptions = [];
	}

		// api calls
	getCampaignsList(){
		return this.campaignService.getCampaignsList(this.campaignSearchOptions);
	}

	getCandidates(){
		let param={
			"AccountId": this.campaignSearchOptions.AccountId,
			"campaignId": this.campaignSearchOptions.campaignId,
			"isForEdit":this.campaignSearchOptions.isForEdit,
			"isForCopy": this.campaignSearchOptions.isForCopy,
		}
		return this.campaignService.getCampaignCandidates(param);
	}

	getCampaignDetails(){
		return this.campaignService.getCampaign(this.campaignSearchOptions);
	}

	getTriggerConfigurations(){
		let param = {
			"TemplateConfig":{
		  "TemplateType":"default",
			"Category":"campaign",
			 "AccountId": this.campaignSearchOptions.AccountId,
			 "CampaignId": this.campaignSearchOptions.campaignId
			},"IsForCopy": this.campaignSearchOptions.isForCopy
		}
		return this.campaignService.getCampaignTriggerConfigurations(param)
	}

	disableEditCampaign(campaign){
		let disableEditCampaignBtn = true;
		if(this.loggedInUser.userId==campaign.CreatedBy){
			if(!campaign.IsTriggered){
				disableEditCampaignBtn = false;
			}	
		}
		return disableEditCampaignBtn;
	}

	copyCampaign(campaign){
		this.campaignSearchOptions.AccountId = campaign.AccountId;
		this.campaignSearchOptions.campaignId = campaign.CampaignId;
		this.campaignSearchOptions.isForCopy = true;
		forkJoin([this.getTriggerConfigurations(),this.getCandidates()]).subscribe(response=>{
			this.openAddNewCampaignModal(false, true, campaign, response[0], response[1]);	//edit: false, copy: true, template, candidates
		});
	}

	ngOnDestroy(): void {
		this.destroy$.next();  // trigger the unsubscribe
		this.destroy$.complete(); // finalize & clean up the subject stream
	}

	pageChanged(pageNo: number) {
		this.campaignSearchOptions.PageNo = pageNo;
		this.loadCampaignsList();
	}
}
