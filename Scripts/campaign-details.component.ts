import { Component, OnInit } from '@angular/core';
import { CampaignService } from '@appcore/services/campaign.service';
import { UIRouterStateParams } from 'src/ng2/app/ajs-upgraded-providers';
import { faArrowLeft, faChevronDown, faChevronRight, faPaperPlane, faPencil} from '@fortawesome/pro-solid-svg-icons';
import { AppConfigService } from '@appconfig/app-config.service';
import { TableStorageService } from '@appcore/services/table-storage.service';
import { HttpClient } from '@angular/common/http';
import { CommonCandidateService } from '@appcore/services/common-candidate.service';
import { catchError } from 'rxjs/operators';
import { forkJoin, of, Subscription } from 'rxjs';

import { BsModalService } from 'ngx-bootstrap';
import { AccountService } from '@appcore/services/account.service';
import { campaignCandidateConfig, campaignDetailConfig, CampaignSearchOptions, candidateConfig, columnConfig, currentObjectConfig } from '@appcore/model/CampaignModels/campaignDto';
import { DatelocalPipe } from '../../shared/pipe/datelocal.pipe';
import { faBan } from '@fortawesome/pro-light-svg-icons';
import { faEnvelope } from '@fortawesome/pro-regular-svg-icons';
import { SharedModule } from '../shared/shared.module';
import { CampaignsListComponent } from './campaigns-list/campaigns-list.component';
import { AddNewCampaignComponent } from './add-new-campaign/add-new-campaign.component';
import { CampaignDetailsComponent } from './campaign-details/campaign-details.component';
import { CopyCampaignComponent } from './copy-campaign/copy-campaign.component';

@Component({
	selector: 'app-campaign-details',
	templateUrl: './campaign-details.component.html',
	styleUrls: ['./campaign-details.component.scss']
})
export class CampaignDetailsComponent implements OnInit {

	private _engagementConfigObj = AppConfigService.engagementConfigObj;
	private _tableStorage : TableStorageService;
	fas = { faArrowLeft, faPaperPlane, faPencil, faChevronRight, faChevronDown, faBan, faEnvelope}
	searchOptions 			: CampaignSearchOptions = {};
	campaignId					: number;
	accountId						: any;
	campaign						: any;
	candidatesList			: candidateConfig;
	previewTemplates		: object;
	campaignCreatedOn	 	: string;
	goBackHidden				: boolean;
	SMSSent : number;
	EmailsSent : number;
	EmailsBounced : number;
	SMSResponded : number;
	EmailOpened : number;
	SMSDelievered : number;
	SMSUndelivered : number;
	isNotFound = false;
	ErrorFor: string;
	loggedInUser : LoggedInUser
	singleMailBoxAccount : boolean;
	selectedAccountInfo	 : any;
	subscriptions: Subscription[] = [];
	isSmsExpanded: boolean;
	isEmailExpanded: boolean;
	isDescriptionExpanded: boolean;
	CandidateListColumns: Array<columnConfig>;
	afterTrigger: Array<columnConfig>;
	currentObject: currentObjectConfig;
	count: number;
	
	constructor(
		private router									: UIRouterStateParams,
		private campaignService					: CampaignService,
		private http           					: HttpClient,
		private commonCandidateService	: CommonCandidateService,
		private authenticationService		: AuthenticationService,
		private modalService          	: BsModalService,
		private accountService					: AccountService,
		private dateLocal     				: DatelocalPipe,
	){ 
		this._tableStorage = new TableStorageService(http, this._engagementConfigObj.name, this._engagementConfigObj.key);
		this.currentObject = {
			pageNo      : 1,
			pageSize    : AppConfigService.noOfRecordsPerPage,
			orderBy     : "Name",
			sortOrder   : true,		//true-> ASC
			searchText  : this.searchOptions.SearchText,
			totalRecords: null,
		};
	}

	ngOnInit() {
		this.SMSSent = 0;
		this.EmailsSent = 0;
		this.EmailsBounced = 0;
		this.SMSResponded = 0;
		this.EmailOpened = 0;
		this.SMSDelievered = 0;
		this.SMSUndelivered = 0;
		this.previewTemplates = [];
		this.campaignId = Number(this.router.CampaignId);
		this.searchOptions.campaignId = this.campaignId;
		this.loggedInUser = this.authenticationService.loggedInUser;
		this.searchOptions.SortOrder = 'ASC';		//at first load list will be in Ascending order
		this.searchOptions.OrderBy = 'Name'; 		//and applied on name column
		this.CandidateListColumns = [
			{ title: 'Name', data: 'Name' , hasTemplate: true, ordering : true, searching: true },	//hasTemplate: true -> unsubcribe icon
			{ title: 'Email', data: 'Email', ordering : true, searching: true },
			{ title: 'Phone Number', data: 'PhoneNumber1', ordering : true, searching: true },
		];
		this.afterTrigger = [	
			{ title: 'Email Status', data: 'EmailStatus', ordering: true },	
			{ title: 'SMS Status' ,data: 'SMSStatus', hasTemplate: true, ordering : true },	//hasTemplate: true -> for view response btn 
		];
		this.getCampaignDetails();	
	}

	openChatPanel(candidate: candidateConfig){
		this.commonCandidateService.openChatPanel(candidate);
	}
	

	getCampaignDetails(){
		this.campaignService.getCampaign(this.searchOptions).subscribe((response: campaignDetailConfig)=>{
			if(response){
				this.campaign = response;
				this.accountId = response.AccountId;
				this.getCandidates().subscribe((response:campaignCandidateConfig)=>{
					if(response && response.Candidates){
						this.count = response.Count;
						if(this.campaign.IsTriggered){
							this.processData(response);
							this.candidatesList = response.Candidates;
							this.CandidateListColumns = this.CandidateListColumns.concat(this.afterTrigger);		//gets column email status and sms status
						}
						else{
							this.candidatesList = response.Candidates;
						}
					}
				});
				this.getAccountData();
				this.getTemplates();
				if(response.IsTriggered){
					this.getCampaignStatistics();
				}
			}else{
				this.isNotFound = true;
				this.ErrorFor = 'Campaign';
				return of(false);
			}
		}),catchError(() => {
			this.isNotFound = true;
			this.ErrorFor = 'Campaign';
			return of(false);
		}); 
	}

	processData(candidate :campaignCandidateConfig){
		this.emailStatus(candidate);
		this.smsStatus(candidate);
	}

	emailStatus(candidate){	
		for(let i=0; i< candidate.Count; i++){
			switch(candidate.Candidates[i].EmailStatus){
				case 'EmailNotSent':
					candidate.Candidates[i].EmailStatus = 'Not sent';
				break;
				case 'EmailSent':
					candidate.Candidates[i].EmailStatus = 'Sent';
				break;
				case 'EmailOpened':
					candidate.Candidates[i].EmailStatus = 'Opened';
				break;
				case 'BouncedEmail':
					candidate.Candidates[i].EmailStatus = 'Bounced';
				break;
			}
		}
	}
	smsStatus(candidate){
		for(let i=0; i< candidate.Count; i++){
			switch(candidate.Candidates[i].SMSStatus){
				case 'SMSNotSent':
					candidate.Candidates[i].SMSStatus = 'Not sent';
				break;
				case 'SMSSent':
					candidate.Candidates[i].SMSStatus = 'Sent';
				break;
				case 'SMSDelievered':
					candidate.Candidates[i].SMSStatus = 'Delivered';
				break;
				case 'SMSUndelivered':
					candidate.Candidates[i].SMSStatus = 'Undelivered';
				break;
				case 'SMSResponded':
					candidate.Candidates[i].SMSStatus = 'Responded';
				break;
			}
		}
	}

	getAccountData(){
		this.singleMailBoxAccount = false;
		this.accountService.getAccount(this.accountId).subscribe((response) => {
			this.selectedAccountInfo = response[0];
			if(this.selectedAccountInfo.UseAccountEmailConfig && this.selectedAccountInfo.UseAccountPersonalMail){
				this.singleMailBoxAccount = true;
			}
		});
	}

	getTemplates(){
		this.campaignService.getPreviewTemplates(this.accountId,"campaign",this.campaignId).subscribe((res)=>{
			this.previewTemplates = res[0];	
		});
	}

	getCandidates(){
		return this.campaignService.getCampaignCandidates(this.searchOptions);
	}

	getTriggerConfigurations(){
		let param = {
			"TemplateConfig":{
				"TemplateType":"default",
				"Category":"campaign",
				"AccountId": this.accountId,
				"CampaignId": this.searchOptions.campaignId
			},"IsForCopy": this.searchOptions.isForCopy
		}
		return this.campaignService.getCampaignTriggerConfigurations(param);
	}

	//below method will trigger campaign to the candidates 
	sendCampaign(){
		let defaultParmas = {'accountId':this.accountId ,"campaignId":this.campaignId};
		this.campaignService.sendCampaign(defaultParmas).subscribe((res)=>{
			//to get isTriggered from campaign details on success  
			if(res === 'Campaign will be sent to the candidates'){
				this.getCampaignDetails();
			}
		});
	}

	getCampaignStatistics(){
		this._tableStorage.getTableObj('campaigntickertable', { PartitionKey: this.campaignId, RowKey: this.campaignId }).subscribe((data) => {
			if(data && data[0]){
				this.SMSSent = data[0].SMSSent ? data[0].SMSSent : 0;
				this.SMSResponded = data[0].SMSResponded ? data[0].SMSResponded : 0;
				this.EmailOpened = data[0].EmailOpened ? data[0].EmailOpened : 0;
				this.SMSDelievered = data[0].SMSDelievered ? data[0].SMSDelievered : 0;
				this.EmailsSent = data[0].EmailSent ? data[0].EmailSent : 0;
				this.EmailsBounced = data[0].BouncedEmail ? data[0].BouncedEmail : 0;
				this.SMSUndelivered = data[0].SMSUndelivered ? data[0].SMSUndelivered : 0;
			}
		});
	}
		
	goBack(){
		history.back();
		if(1>history.length){
			this.goBackHidden = true;
		}
	}

	showHideSendCampaignButton(){
		let hideSendCampaignBtn = true;
		if(this.campaign){
			if(this.loggedInUser.userId==this.campaign.CreatedBy){
				if(!this.campaign.IsTriggered){
					hideSendCampaignBtn = false;
				}	
			}
			return hideSendCampaignBtn;
		}
	}

	showHideEditCampaignButton(){
		let hideEditCampaignBtn = true;
		if(this.campaign){
			if(this.loggedInUser.userId==this.campaign.CreatedBy){
				if(!this.campaign.IsTriggered){
					hideEditCampaignBtn = false;
				}	
			}
			return hideEditCampaignBtn;
		}
	}

	filterBy(filterByBtn:string){		
		if(this.searchOptions.FilterBy){
			if(this.searchOptions.FilterBy === filterByBtn){
				delete this.searchOptions.FilterBy;
			}else{
				this.searchOptions.FilterBy = filterByBtn;
			}
		}else{
			this.searchOptions.FilterBy = filterByBtn;
		}
		this. filterCandidates();

		//reference from edit-account.component
		let element = document.getElementById('candidateTable');				//when clicked on Statistics button page will scroll down to candidate list table
		element.scrollIntoView({ behavior: 'smooth', block: 'start' });
	}

	valueChange(event) {
		this.currentObject = event;
		this.searchOptions.OrderBy = this.currentObject.orderBy;
		this.searchOptions.SearchText = this.currentObject.searchText;
		this.searchOptions.SortOrder = this.currentObject.sortOrder ? 'ASC':'DESC';
		this. filterCandidates();
	}

	 filterCandidates(){
		this.getCandidates().subscribe((res:any)=>{
			this.processData(res);
			this.count = res.Count;
			this.candidatesList = res.Candidates;
		})
	}

	editCampaign(){
		this.searchOptions.isForEdit = true;
		this.searchOptions.isForCopy = false;
		forkJoin([this.getTriggerConfigurations(),this.getCandidates()]).subscribe(response=>{
			this.openAddNewCampaignModal(true, false, this.campaign, response[0], response[1]);	//edit: true, copy: false, template, candidates
		});
	}

	openAddNewCampaignModal(isEdit: boolean, isForCopy: boolean, campaignDetails?: campaignDetailConfig, templates?:any, candidatesList?:any){
		let initialState = {
			AccountId : this.accountId,
			isEdit : isEdit,
			isForCopy: isForCopy,
			singleMailBoxAccount : this.singleMailBoxAccount,
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
				this.getCampaignDetails();
				delete this.searchOptions.isForEdit;
				this.unsubscribe();
			})
		);
	}

	unsubscribe() {
		this.subscriptions[0].unsubscribe();
		this.subscriptions = [];
	}
}