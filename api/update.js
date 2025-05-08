export default async function update(req){
    console.log(req);
    return `${req.name},${req.score},${req.address}`;
}